import { useMemo, useRef, useState } from 'react'
import { ProgressRing } from '../../components/ProgressRing'
import { IconBluetooth, IconCamera, IconCar, IconMagnet, IconShield } from '../../components/icons'
import { detectCapabilities, type Capabilities } from '../../lib/capabilities'
import { buildJourney, currentStepIndex, journeyProgress, stepAt } from '../../lib/journey'
import { formatDateTime } from '../../lib/labels'
import type { InspectionState } from '../../lib/types'
import { ZONES } from '../../lib/zones'
import { useInspection } from '../../state/InspectionContext'
import { JourneyPanel } from './JourneyPanel'
import { PriorityList } from './PriorityList'

/** Most recent timestamp the user actually produced, if any. */
function lastActivity(s: InspectionState): string | undefined {
  const stamps = [
    ...Object.values(s.zones).map((z) => z.updatedAt),
    ...s.observations.map((o) => o.createdAt),
    s.magneticBaseline?.at,
    s.osChecks.android.at,
    s.osChecks.ios.at,
  ].filter((x): x is string => !!x)
  return stamps.sort().at(-1)
}

function scrollIntoViewGently(el: HTMLElement | null) {
  if (!el) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

export function WorkflowView() {
  const { state } = useInspection()
  const caps = useMemo(() => detectCapabilities(), [])
  const steps = useMemo(() => buildJourney(state, caps), [state, caps])
  const current = currentStepIndex(steps)
  const currentStep = stepAt(steps, current)
  const progress = journeyProgress(steps, state)
  const [picked, setPicked] = useState<number>()
  const selected = picked ?? current
  const journeyRef = useRef<HTMLElement>(null)
  const last = lastActivity(state)
  // "Started" means the user did something; an unavailable sensor alone must not look like progress made.
  const started = last !== undefined || Object.keys(state.stepMarks ?? {}).length > 0
  const percent = Math.round(progress * 100)

  const resume = () => {
    setPicked(undefined)
    scrollIntoViewGently(journeyRef.current)
  }

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-body">
          <div className="eyebrow">VEHICLE INSPECTION</div>
          <h1 id="hero-title">خطوات فحص السيارة</h1>
          <p className="muted hero-copy">
            {started
              ? `الخطوة الحالية: ${currentStep.title}. ${currentStep.summary}.`
              : 'فحص منظّم بسبع خطوات: تجهّز، تفحص المناطق بعينك، تراجع المستشعرات المتاحة، وتوثّق ما تراه.'}
          </p>
          <button type="button" className="btn btn--primary btn--lg" onClick={resume}>
            {started ? `تابع الفحص: ${currentStep.short}` : 'ابدأ فحص السيارة'}
          </button>
          {last && <p className="faint hero-last">آخر نشاط: {formatDateTime(last)}</p>}
        </div>
        <ProgressRing value={progress} label={`نسبة التقدم في الرحلة ${percent}%`}>
          <span className="ring-number mono">{percent}<small>%</small></span>
          <span className="ring-caption">من الرحلة</span>
        </ProgressRing>
      </section>

      <ToolGrid state={state} caps={caps} />

      <JourneyPanel ref={journeyRef} steps={steps} selected={selected} current={current} onSelect={setPicked} />

      <section className="panel priority-panel" aria-labelledby="priority-title">
        <h2 id="priority-title">الأماكن المقترحة لفحص أدق</h2>
        <PriorityList />
      </section>

      <details className="panel limits">
        <summary>
          <IconShield width={20} height={20} />
          <span>ما الذي يستطيعه التطبيق وما لا يستطيعه</span>
        </summary>
        <div className="limits-body">
          <p>
            هذا التطبيق لا يكشف أجهزة التتبع أو التسجيل تلقائيًا ولا يحدد مكانها، ولا ترى الكاميرا عبر ألواح السيارة. هو يساعدك على فحص منظم وتوثيق ما تراه،
            والقرار النهائي مبني على ما تعاينه بنفسك.
          </p>
          <p>إن كنت تخشى على سلامتك، تواصل مع الشرطة أو جهة مختصة أولًا، ولا تنزع أي جهاز تجده قبل توثيقه.</p>
        </div>
      </details>
    </>
  )
}

interface ToolGridProps {
  readonly state: InspectionState
  readonly caps: Capabilities
}

function ToolGrid({ state, caps }: ToolGridProps) {
  const inspected = ZONES.filter((z) => state.zones[z.id].status !== 'not_inspected').length
  const followup = ZONES.filter((z) => state.zones[z.id].status === 'needs_followup').length
  const photos = Object.values(state.zones).reduce((n, z) => n + z.photoIds.length, 0)
  const radioDone = state.osChecks.android.result !== undefined || state.osChecks.ios.result !== undefined

  return (
    <nav className="tools" aria-label="أدوات الفحص">
      <a className="tool tool--camera" href="#/camera">
        <span className="tool-icon"><IconCamera /></span>
        <span className="tool-name">الكاميرا والكشاف</span>
        <span className="tool-meta">{caps.camera ? `${photos} صورة محفوظة` : 'ارفع صورًا من كاميرا الهاتف'}</span>
        <span className="tool-viewfinder" aria-hidden="true"><i /><i /><i /><i /></span>
      </a>
      <a className="tool" href="#/checklist">
        <span className="tool-icon"><IconCar /></span>
        <span className="tool-name">خريطة السيارة</span>
        <span className="tool-meta"><span className="mono">{inspected}/{ZONES.length}</span> مناطق{followup > 0 ? ` · ${followup} للمتابعة` : ''}</span>
        <span className="bar" aria-hidden="true"><span style={{ ['--p' as string]: inspected / ZONES.length }} /></span>
      </a>
      <a className={`tool${caps.magnetometer ? '' : ' is-unavailable'}`} href="#/sensor">
        <span className="tool-icon"><IconMagnet /></span>
        <span className="tool-name">المستشعر المغناطيسي</span>
        <span className="tool-meta">{caps.magnetometer ? (state.magneticBaseline ? 'خط الأساس مسجّل' : 'متاح على هذا الجهاز') : 'غير متاح في هذا المتصفح'}</span>
      </a>
      <a className="tool" href="#/bluetooth">
        <span className="tool-icon"><IconBluetooth /></span>
        <span className="tool-name">البلوتوث وتنبيهات النظام</span>
        <span className="tool-meta">{radioDone ? 'سجّلت نتيجة النظام' : caps.webBluetooth ? 'فحص من المتصفح والنظام' : 'إرشادات فحص النظام'}</span>
      </a>
    </nav>
  )
}
