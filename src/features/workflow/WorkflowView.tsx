import { useMemo, type ReactNode } from 'react'
import { Callout } from '../../components/Callout'
import { PageHead } from '../../components/PageHead'
import { detectCapabilities } from '../../lib/capabilities'
import { ZONES } from '../../lib/zones'
import { useInspection } from '../../state/InspectionContext'
import { PriorityList } from './PriorityList'

type StepState = 'done' | 'progress' | 'todo' | 'unavailable'

const STEP_STATE_LABEL: Record<StepState, string> = { done: 'مكتمل', progress: 'جارٍ', todo: 'لم يبدأ', unavailable: 'غير متاح هنا' }
const STEP_STATE_CHIP: Record<StepState, string> = { done: 'inspected', progress: 'needs_followup', todo: 'not_inspected', unavailable: 'inconclusive' }

interface StepProps {
  readonly n: number
  readonly title: string
  readonly status: StepState
  readonly children: ReactNode
}

function Step({ n, title, status, children }: StepProps) {
  return (
    <li className="panel" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-3)' }}>
      <span
        className="mono"
        aria-hidden="true"
        style={{
          width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 600,
          border: `1px solid ${status === 'done' ? 'var(--c-teal)' : 'var(--c-line-strong)'}`,
          color: status === 'done' ? 'var(--c-teal)' : 'var(--c-text-dim)',
        }}
      >
        {n}
      </span>
      <div>
        <div className="panel-title" style={{ marginBottom: 'var(--space-2)' }}>
          <h2 style={{ fontSize: '1.05rem' }}>{title}</h2>
          <span className={`chip chip--${STEP_STATE_CHIP[status]}`}>{STEP_STATE_LABEL[status]}</span>
        </div>
        {children}
      </div>
    </li>
  )
}

export function WorkflowView() {
  const { state } = useInspection()
  const caps = useMemo(() => detectCapabilities(), [])
  const inspected = ZONES.filter((z) => state.zones[z.id].status !== 'not_inspected').length
  const magneticCount = state.observations.filter((o) => o.kind === 'magnetic').length
  const counts = {
    confirmed: state.observations.filter((o) => o.classification === 'confirmed').length,
    suspicious: state.observations.filter((o) => o.classification === 'suspicious').length,
    inconclusive: state.observations.filter((o) => o.classification === 'inconclusive').length,
  }
  const osDone = state.osChecks.android.result !== undefined || state.osChecks.ios.result !== undefined

  const visual: StepState = inspected === ZONES.length ? 'done' : inspected > 0 ? 'progress' : 'todo'
  const sensor: StepState = !caps.magnetometer ? 'unavailable' : state.magneticBaseline && magneticCount > 0 ? 'done' : state.magneticBaseline ? 'progress' : 'todo'
  const radio: StepState = osDone ? 'done' : state.bluetoothChecked ? 'progress' : 'todo'
  const total = state.observations.length
  const review: StepState = total === 0 ? 'todo' : 'done'

  return (
    <>
      <PageHead eyebrow="INVESTIGATION" title="خطوات فحص السيارة">
        <p>اتبع الخطوات بالترتيب. كل خطوة تضيف معلومات تساعدك على تضييق الأماكن التي تستحق فحصًا أدق.</p>
      </PageHead>

      <Callout tone="warn" title="قبل أن تبدأ">
        <p>
          هذا التطبيق لا يكشف أجهزة التتبع أو التسجيل تلقائيًا ولا يحدد مكانها. هو يساعدك على فحص منظم وتوثيق ما تراه. القرار النهائي مبني على ما تعاينه بنفسك.
          إن كنت تخشى على سلامتك، تواصل مع الشرطة أو جهة مختصة أولًا، ولا تنزع أي جهاز تجده قبل توثيقه.
        </p>
      </Callout>

      <ol className="list-reset stack" style={{ marginTop: 'var(--space-4)' }}>
        <Step n={1} title="الفحص البصري للمناطق" status={visual}>
          <p className="muted">تم فحص {inspected} من {ZONES.length} مناطق. ابدأ بمنفذ التشخيص وأسفل التابلوه والشنطة، فهي أماكن شائعة.</p>
          <div className="btn-row">
            <a className="btn btn--primary" href="#/checklist">فتح خريطة الفحص</a>
            <a className="btn" href="#/camera">الكاميرا والكشاف</a>
          </div>
        </Step>
        <Step n={2} title="خط الأساس المغناطيسي والمقارنة" status={sensor}>
          {caps.magnetometer ? (
            <p className="muted">{state.magneticBaseline ? `خط الأساس مسجّل. عدد قياسات المناطق: ${magneticCount}.` : 'سجّل خط الأساس ثم قارن المناطق.'}</p>
          ) : (
            <p className="muted">المتصفح الحالي لا يوفّر المستشعر المغناطيسي. افتح الصفحة لمعرفة البدائل، أو تخطَّ هذه الخطوة.</p>
          )}
          <a className="btn" href="#/sensor">فتح المستشعر</a>
        </Step>
        <Step n={3} title="فحص البلوتوث وتنبيهات النظام" status={radio}>
          <p className="muted">شغّل فحص أجهزة التتبع غير المعروفة في أندرويد أو تأكد من تنبيهات التتبع في آيفون، وسجّل النتيجة.</p>
          <a className="btn" href="#/bluetooth">فتح فحص البلوتوث</a>
        </Step>
        <Step n={4} title="مراجعة الملاحظات" status={review}>
          <p className="muted">
            مؤكدة منك: <span className="mono">{counts.confirmed}</span> · مشتبه بها: <span className="mono">{counts.suspicious}</span> · غير حاسمة:{' '}
            <span className="mono">{counts.inconclusive}</span>
          </p>
          <p className="faint">راجع كل ملاحظة وعدّل تصنيفها إن تغيّر رأيك بعد المعاينة. التطبيق لا يرفع تصنيف أي قياس إلى «مؤكد» بنفسه.</p>
        </Step>
        <Step n={5} title="الأماكن المقترحة لفحص أدق" status={total > 0 ? 'done' : 'todo'}>
          <PriorityList />
        </Step>
      </ol>
    </>
  )
}
