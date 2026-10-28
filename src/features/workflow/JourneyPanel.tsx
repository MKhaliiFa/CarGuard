import { useState, type Ref } from 'react'
import { IconCheck, IconChevron, IconSkip } from '../../components/icons'
import { useToast } from '../../components/Toast'
import { STEP_STATE_LABEL, isResolved, stepAt, type JourneyStep, type StepState } from '../../lib/journey'
import { useInspection } from '../../state/InspectionContext'

const AR_DIGITS = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

interface JourneyPanelProps {
  readonly steps: readonly JourneyStep[]
  readonly selected: number
  readonly current: number
  readonly onSelect: (index: number | undefined) => void
  readonly ref?: Ref<HTMLElement>
}

function StepGlyph({ state, n }: { readonly state: StepState; readonly n: number }) {
  if (state === 'done') return <IconCheck width={14} height={14} />
  if (state === 'skipped') return <IconSkip width={12} height={12} />
  if (state === 'unavailable') return <span>–</span>
  if (state === 'inconclusive') return <span>؟</span>
  return <span>{AR_DIGITS[n]}</span>
}

/** Guided seven-step journey: a rail for overview, a card for the selected step. */
export function JourneyPanel({ steps, selected, current, onSelect, ref }: JourneyPanelProps) {
  const { dispatch } = useInspection()
  const toast = useToast()
  // Slide direction follows the move between steps (adjust-state-during-render pattern).
  const [prev, setPrev] = useState(selected)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  if (prev !== selected) {
    setDirection(selected > prev ? 'forward' : 'back')
    setPrev(selected)
  }

  const step = stepAt(steps, selected)
  const resolvedCount = steps.filter((s) => isResolved(s.state)).length
  const dataDecided = step.state === 'unavailable' || ((step.state === 'done' || step.state === 'inconclusive') && !step.manual)
  const marked = step.state === 'done' || step.state === 'skipped'

  const mark = (m: 'done' | 'skipped' | undefined) => {
    dispatch({ type: 'setStepMark', step: step.id, mark: m })
    if (m === 'done') toast('تم تعليم الخطوة مكتملة')
    if (m === 'skipped') toast('تم تخطي الخطوة. يمكنك العودة لها في أي وقت.', 'info')
    // Hand control back to "current" so the journey moves to the next open step.
    onSelect(m ? undefined : selected)
  }

  return (
    <section className="journey" ref={ref} aria-labelledby="journey-title" tabIndex={-1}>
      <div className="journey-head">
        <h2 id="journey-title">رحلة الفحص</h2>
        <span className="faint"><span className="mono">{resolvedCount}</span> من <span className="mono">{steps.length}</span> خطوات منتهية</span>
      </div>

      <ol className="stepper" aria-label="خطوات الرحلة">
        {steps.map((s, i) => (
          <li key={s.id} className={`stepper-item is-${s.state}${i === current ? ' is-current' : ''}`}>
            <button
              type="button"
              aria-current={i === selected ? 'step' : undefined}
              aria-label={`الخطوة ${i + 1}: ${s.title} — ${STEP_STATE_LABEL[s.state]}`}
              onClick={() => onSelect(i)}
            >
              <span className="stepper-dot"><StepGlyph state={s.state} n={i} /></span>
              <span className="stepper-label">{s.short}</span>
            </button>
          </li>
        ))}
      </ol>

      <article key={step.id} className={`journey-card is-${direction}`} aria-live="polite">
        <header className="journey-card-head">
          <span className="faint">الخطوة <span className="mono">{selected + 1}</span> من <span className="mono">{steps.length}</span></span>
          <span className={`chip chip--${step.state}`}>{STEP_STATE_LABEL[step.state]}</span>
        </header>
        <h3 className="journey-title">{step.title}</h3>

        <dl className="journey-facts">
          <div>
            <dt>لماذا هذه الخطوة؟</dt>
            <dd>{step.why}</dd>
          </div>
          <div>
            <dt>ماذا تفعل الآن</dt>
            <dd>{step.now}</dd>
          </div>
          <div className="journey-observed">
            <dt>ما سُجّل حتى الآن</dt>
            <dd>{step.summary}</dd>
          </div>
        </dl>

        <div className="btn-row journey-actions">
          {step.route && (
            <a className={`btn ${isResolved(step.state) ? '' : 'btn--primary'}`} href={step.route}>
              {step.routeLabel}
            </a>
          )}
          {!dataDecided && !marked && step.manual && (
            <button type="button" className={`btn ${step.route ? '' : 'btn--primary'}`} onClick={() => mark('done')}>
              <IconCheck /> تمت هذه الخطوة
            </button>
          )}
          {!dataDecided && !marked && (
            <button type="button" className="btn btn--quiet" onClick={() => mark('skipped')}>تخطي الآن</button>
          )}
          {!dataDecided && marked && (
            <button type="button" className="btn btn--quiet" onClick={() => mark(undefined)}>تراجع عن التعليم</button>
          )}
        </div>
      </article>

      <nav className="journey-nav" aria-label="التنقل بين الخطوات">
        <button type="button" className="btn btn--ghost" disabled={selected === 0} onClick={() => onSelect(selected - 1)}>
          <IconChevron style={{ transform: 'scaleX(-1)' }} /> السابقة
        </button>
        {selected !== current && (
          <button type="button" className="btn btn--quiet" onClick={() => onSelect(undefined)}>الخطوة الحالية</button>
        )}
        <button type="button" className="btn btn--ghost" disabled={selected === steps.length - 1} onClick={() => onSelect(selected + 1)}>
          التالية <IconChevron />
        </button>
      </nav>
    </section>
  )
}
