import type { Capabilities } from './capabilities'
import type { InspectionState, JourneyStepId } from './types'
import { ZONES } from './zones'

/**
 * done          — real recorded data (or the user's explicit mark) shows the step is finished.
 * inconclusive  — the step ran, but what it recorded points neither way.
 * progress      — started, not finished.
 * todo          — not started.
 * skipped       — the user chose to skip it.
 * unavailable   — this device/browser cannot run it; never counted against the user.
 */
export type StepState = 'done' | 'inconclusive' | 'progress' | 'todo' | 'skipped' | 'unavailable'

export interface JourneyStep {
  readonly id: JourneyStepId
  readonly title: string
  readonly short: string
  readonly why: string
  readonly now: string
  readonly state: StepState
  /** Real, short summary of what was recorded so far. Never an inference. */
  readonly summary: string
  readonly route?: string
  readonly routeLabel?: string
  /** Steps the user finishes by hand rather than by recording data. */
  readonly manual: boolean
}

type StepResult = Pick<JourneyStep, 'state' | 'summary'>
type Caps = Pick<Capabilities, 'magnetometer'>

export const STEP_STATE_LABEL: Record<StepState, string> = {
  done: 'مكتملة',
  inconclusive: 'غير حاسمة',
  progress: 'جارية',
  todo: 'لم تبدأ',
  skipped: 'تم تخطيها',
  unavailable: 'غير متاحة هنا',
}

/** Resolved steps let the journey move on. */
export function isResolved(state: StepState): boolean {
  return state === 'done' || state === 'inconclusive' || state === 'skipped' || state === 'unavailable'
}

function visualStep(s: InspectionState): StepResult {
  const inspected = ZONES.filter((z) => s.zones[z.id].status !== 'not_inspected').length
  const followup = ZONES.filter((z) => s.zones[z.id].status === 'needs_followup').length
  const state = inspected === ZONES.length ? 'done' : inspected > 0 ? 'progress' : 'todo'
  const extra = followup > 0 ? ` · ${followup} تحتاج متابعة` : ''
  return { state, summary: `تم فحص ${inspected} من ${ZONES.length} مناطق${extra}` }
}

function sensorStep(s: InspectionState, caps: Caps): StepResult {
  if (!caps.magnetometer) return { state: 'unavailable', summary: 'هذا المتصفح لا يوفّر المستشعر المغناطيسي' }
  const readings = s.observations.filter((o) => o.kind === 'magnetic')
  if (!s.magneticBaseline) return { state: 'todo', summary: 'لم يُسجَّل خط الأساس بعد' }
  if (readings.length === 0) return { state: 'progress', summary: 'خط الأساس مسجّل، ولا توجد قياسات مناطق بعد' }
  const suspicious = readings.filter((o) => o.classification === 'suspicious').length
  if (suspicious === 0) return { state: 'inconclusive', summary: `${readings.length} قياس دون تغيّر واضح، وهذا لا ينفي وجود جهاز` }
  return { state: 'done', summary: `${readings.length} قياس، منها ${suspicious} بتغيّر يستحق فحصًا بصريًا` }
}

function radioStep(s: InspectionState): StepResult {
  const results = [s.osChecks.android.result, s.osChecks.ios.result]
  if (results.includes('alert_shown')) return { state: 'done', summary: 'سجّلت ظهور تنبيه تتبع من النظام' }
  if (results.includes('no_alert')) return { state: 'done', summary: 'سجّلت عدم ظهور تنبيه من النظام' }
  if (results.includes('not_available')) return { state: 'inconclusive', summary: 'فحص النظام غير متاح على جهازك' }
  if (s.bluetoothChecked) return { state: 'progress', summary: 'بدأت فحص البلوتوث ولم تسجّل نتيجة النظام' }
  return { state: 'todo', summary: 'لم تسجّل نتيجة بعد' }
}

function recordStep(s: InspectionState): StepResult {
  const user = s.observations.filter((o) => o.source === 'user').length
  if (user > 0) return { state: 'done', summary: `${user} ملاحظة مسجلة منك` }
  return { state: 'todo', summary: 'لا توجد ملاحظات مكتوبة بعد' }
}

function reviewStep(s: InspectionState): StepResult {
  const flagged = ZONES.filter(
    (z) => s.zones[z.id].status === 'needs_followup' || s.observations.some((o) => o.zoneId === z.id && o.classification !== 'inconclusive'),
  ).length
  return { state: 'todo', summary: flagged > 0 ? `${flagged} منطقة تستحق نظرة ثانية` : 'لا توجد مناطق معلّمة للمتابعة' }
}

/** Builds the seven-step journey from recorded data. Pure: same input, same output. */
export function buildJourney(s: InspectionState, caps: Caps): readonly JourneyStep[] {
  const marks = s.stepMarks ?? {}
  const derived: Record<JourneyStepId, StepResult> = {
    prepare: { state: 'todo', summary: 'السيارة متوقفة والمحرك مطفأ والكشاف جاهز' },
    visual: visualStep(s),
    sensor: sensorStep(s, caps),
    radio: radioStep(s),
    record: recordStep(s),
    review: reviewStep(s),
    report: { state: 'todo', summary: 'التقرير اختياري ويُنشأ على جهازك فقط' },
  }

  const resolve = (id: JourneyStepId): StepResult => {
    const d = derived[id]
    // Data-backed results win; otherwise honour the user's own mark.
    if (d.state === 'done' || d.state === 'inconclusive' || d.state === 'unavailable') return d
    const mark = marks[id]
    if (mark === 'done') return { ...d, state: 'done' }
    if (mark === 'skipped') return { ...d, state: 'skipped' }
    return d
  }

  return STEP_DEFS.map((def) => ({ ...def, ...resolve(def.id) }))
}

/** Indexed access with a clear failure instead of a silent undefined. */
export function stepAt(steps: readonly JourneyStep[], index: number): JourneyStep {
  const step = steps[index]
  if (!step) throw new Error(`No journey step at index ${index}`)
  return step
}

/** Index of the first step that still needs attention, or the last step when all are resolved. */
export function currentStepIndex(steps: readonly JourneyStep[]): number {
  const i = steps.findIndex((s) => !isResolved(s.state))
  return i === -1 ? steps.length - 1 : i
}

/**
 * 0..1 — resolved steps count fully; the visual step counts partially by zones covered.
 * Steps this device cannot run are left out entirely, so they neither inflate nor hold back progress.
 */
export function journeyProgress(steps: readonly JourneyStep[], s: InspectionState): number {
  const zonesDone = ZONES.filter((z) => s.zones[z.id].status !== 'not_inspected').length / ZONES.length
  const counted = steps.filter((step) => step.state !== 'unavailable')
  if (counted.length === 0) return 1
  const total = counted.reduce((sum, step) => {
    if (isResolved(step.state)) return sum + 1
    if (step.id === 'visual') return sum + zonesDone
    return sum
  }, 0)
  return total / counted.length
}

const STEP_DEFS: readonly Omit<JourneyStep, 'state' | 'summary'>[] = [
  {
    id: 'prepare',
    title: 'جهّز الفحص',
    short: 'التجهيز',
    why: 'الفحص الآمن يبدأ بسيارة متوقفة ومحرك بارد. هذا يحميك ويجعل ما تراه أوضح.',
    now: 'أوقف السيارة في مكان مضاء وآمن، أطفئ المحرك، فعّل فرامل اليد، وجهّز كشافًا أو كاميرا الهاتف.',
    manual: true,
  },
  {
    id: 'visual',
    title: 'افحص المناطق بعينك',
    short: 'الفحص البصري',
    why: 'أغلب الأجهزة المخفية تُكتشف بالنظر في أماكن معروفة، لا بالمستشعرات.',
    now: 'افتح خريطة السيارة وابدأ بمنفذ التشخيص وأسفل التابلوه والشنطة، ثم سجّل حالة كل منطقة.',
    route: '#/checklist',
    routeLabel: 'فتح خريطة السيارة',
    manual: false,
  },
  {
    id: 'sensor',
    title: 'راجع قراءات المستشعر',
    short: 'المستشعر',
    why: 'المستشعر المغناطيسي قد يلفت انتباهك لمنطقة تستحق نظرة أقرب، لكنه لا يثبت وجود جهاز.',
    now: 'سجّل خط الأساس في منتصف المقصورة، ثم قارن المناطق واحدة تلو الأخرى.',
    route: '#/sensor',
    routeLabel: 'فتح المستشعر',
    manual: false,
  },
  {
    id: 'radio',
    title: 'راجع تنبيهات البلوتوث والنظام',
    short: 'البلوتوث',
    why: 'أندرويد وآيفون يستطيعان التنبيه عن بعض أجهزة التتبع المعروفة التي تتحرك معك.',
    now: 'شغّل فحص أجهزة التتبع من إعدادات هاتفك، ثم سجّل النتيجة هنا كما ظهرت.',
    route: '#/bluetooth',
    routeLabel: 'فتح فحص البلوتوث',
    manual: false,
  },
  {
    id: 'record',
    title: 'سجّل ما يثير شكّك',
    short: 'التوثيق',
    why: 'التوثيق بالصور والكلمات يحفظ ما رأيته بدقة، ويفيدك إن احتجت مختصًا أو جهة قانونية.',
    now: 'أضف ملاحظة أو صورة لكل شيء غير مألوف. إن لم تجد شيئًا، علّم الخطوة مكتملة.',
    route: '#/checklist',
    routeLabel: 'إضافة ملاحظة من الخريطة',
    manual: true,
  },
  {
    id: 'review',
    title: 'راجع المناطق المعلّمة',
    short: 'المراجعة',
    why: 'نظرة ثانية هادئة على المناطق المعلّمة تقلل الإنذارات الخاطئة وتكشف ما فاتك.',
    now: 'راجع قائمة الأولويات بالأسفل، وأعد فحص كل منطقة معلّمة بالكاميرا، وعدّل تصنيف ملاحظاتك إن تغيّر رأيك.',
    manual: true,
  },
  {
    id: 'report',
    title: 'أنشئ تقريرًا (اختياري)',
    short: 'التقرير',
    why: 'التقرير يجمع ما سجلته في ملف واحد على جهازك. لا يُرسل لأي مكان.',
    now: 'افتح صفحة التقرير، وراجع المحتوى، ثم أنشئ الملف إن احتجته.',
    route: '#/report',
    routeLabel: 'فتح التقرير',
    manual: true,
  },
]
