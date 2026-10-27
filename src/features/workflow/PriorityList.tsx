import { TIER_LABEL, prioritizeZones } from '../../lib/prioritize'
import { getZone } from '../../lib/zones'
import { useInspection } from '../../state/InspectionContext'

const TIER_CHIP = { confirmed: 'confirmed', suspicious: 'suspicious', followup: 'needs_followup', inconclusive: 'inconclusive' } as const

export function PriorityList() {
  const { state } = useInspection()
  const { ranked, notInspected } = prioritizeZones(state)

  return (
    <div className="stack">
      {ranked.length === 0 ? (
        <p className="muted">لا توجد ملاحظات مسجلة بعد، لذلك لا توجد أولويات. الترتيب يُبنى فقط على ما سجلته أنت، ولا يقدّر التطبيق احتمالات.</p>
      ) : (
        <ol className="list-reset stack">
          {ranked.map((z, i) => (
            <li key={z.zoneId} className="panel" style={{ background: 'var(--c-bg-raised)' }}>
              <div className="panel-title">
                <h3><span className="mono faint">{i + 1}.</span> {z.title}</h3>
                <span className={`chip chip--${TIER_CHIP[z.tier]}`}>{TIER_LABEL[z.tier]}</span>
              </div>
              <ul style={{ marginBottom: 'var(--space-2)' }}>{z.reasons.map((r, j) => <li key={j}>{r}</li>)}</ul>
              <a className="btn btn--ghost" href={`#/camera?zone=${z.zoneId}`}>إعادة فحص بالكاميرا</a>
            </li>
          ))}
        </ol>
      )}
      {notInspected.length > 0 && (
        <p className="faint">مناطق لم تُفحص بعد: {notInspected.map((id) => getZone(id).title).join('، ')}.</p>
      )}
    </div>
  )
}
