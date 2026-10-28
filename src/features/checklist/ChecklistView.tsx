import { useState } from 'react'
import { PageHead } from '../../components/PageHead'
import { IconChevron } from '../../components/icons'
import { STATUS_LABEL } from '../../lib/labels'
import { ZONES } from '../../lib/zones'
import type { InspectionState, ZoneId } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'
import { VehicleMap } from './VehicleMap'
import { ZoneDetail } from './ZoneDetail'

const AREA_LABEL = { exterior: 'خارجي', engine: 'المحرك', cabin: 'المقصورة', cargo: 'الشنطة' } as const

/** Next zone after `from` that still has no status, wrapping around; undefined when every zone is done. */
function nextOpenZone(state: InspectionState, from: ZoneId): ZoneId | undefined {
  const start = ZONES.findIndex((z) => z.id === from)
  for (let k = 1; k < ZONES.length; k++) {
    const z = ZONES[(start + k) % ZONES.length]
    if (z && state.zones[z.id].status === 'not_inspected') return z.id
  }
  return undefined
}

function revealRow(id: ZoneId) {
  requestAnimationFrame(() => {
    const el = document.getElementById(`zone-row-${id}`)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    el?.querySelector('button')?.focus({ preventScroll: true })
  })
}

export function ChecklistView() {
  const { state } = useInspection()
  const [openZone, setOpenZone] = useState<ZoneId | undefined>()
  const done = ZONES.filter((z) => state.zones[z.id].status !== 'not_inspected').length

  const open = (id: ZoneId) => {
    setOpenZone(id)
    revealRow(id)
  }

  return (
    <>
      <PageHead eyebrow="VEHICLE MAP" title="خريطة فحص السيارة">
        <p>
          اختر منطقة من الرسم أو من القائمة، افحصها بالعين والكشاف، ثم سجّل حالتها. تم فحص {done} من {ZONES.length} مناطق.
        </p>
      </PageHead>

      <div className="map-layout">
        <VehicleMap selected={openZone} onSelect={open} />

        <div className="panel panel--flush zone-list">
          <div className="zone-list-head">
            <span className="faint">التقدم</span>
            <span className="bar" aria-hidden="true"><span style={{ ['--p' as string]: done / ZONES.length }} /></span>
            <span className="mono faint">{done}/{ZONES.length}</span>
          </div>
          <ul className="list-reset">
            {ZONES.map((zone, i) => {
              const rec = state.zones[zone.id]
              const count = state.observations.filter((o) => o.zoneId === zone.id).length
              const isOpen = openZone === zone.id
              const next = isOpen ? nextOpenZone(state, zone.id) : undefined
              return (
                <li key={zone.id} id={`zone-row-${zone.id}`} className={`zone-row is-${rec.status}${isOpen ? ' is-open' : ''}`}>
                  <h2 className="zone-row-heading">
                    <button
                      type="button"
                      className="zone-row-btn"
                      aria-expanded={isOpen}
                      aria-controls={`zone-${zone.id}`}
                      onClick={() => setOpenZone(isOpen ? undefined : zone.id)}
                    >
                      <span className="zone-num mono">{String(i + 1).padStart(2, '0')}</span>
                      <span className="zone-text">
                        <span className="zone-title">{zone.title}</span>
                        <span className="faint">
                          {AREA_LABEL[zone.area]}
                          {count > 0 ? ` · ${count} ملاحظة` : ''}
                          {rec.photoIds.length > 0 ? ` · ${rec.photoIds.length} صورة` : ''}
                        </span>
                      </span>
                      <span className={`chip chip--${rec.status}`}>{STATUS_LABEL[rec.status]}</span>
                      <IconChevron className="zone-caret" width={18} height={18} />
                    </button>
                  </h2>
                  {isOpen && (
                    <div id={`zone-${zone.id}`} className="zone-panel">
                      <ZoneDetail zone={zone} onNext={next ? () => open(next) : undefined} nextTitle={next ? ZONES.find((z) => z.id === next)?.title : undefined} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </>
  )
}
