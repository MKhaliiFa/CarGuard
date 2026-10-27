import { useState } from 'react'
import { PageHead } from '../../components/PageHead'
import { STATUS_LABEL } from '../../lib/labels'
import { ZONES } from '../../lib/zones'
import type { ZoneId } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'
import { ZoneDetail } from './ZoneDetail'

const AREA_LABEL = { exterior: 'خارجي', engine: 'المحرك', cabin: 'المقصورة', cargo: 'الشنطة' } as const

export function ChecklistView() {
  const { state } = useInspection()
  const [openZone, setOpenZone] = useState<ZoneId | undefined>()
  const done = ZONES.filter((z) => state.zones[z.id].status !== 'not_inspected').length

  return (
    <>
      <PageHead eyebrow="VEHICLE MAP" title="خريطة فحص السيارة">
        <p>
          افحص كل منطقة بالعين والكشاف، ثم سجّل حالتها. تم فحص {done} من {ZONES.length} مناطق.
        </p>
      </PageHead>
      <div className="panel panel--flush">
        <ul className="list-reset">
          {ZONES.map((zone, i) => {
            const rec = state.zones[zone.id]
            const count = state.observations.filter((o) => o.zoneId === zone.id).length
            const isOpen = openZone === zone.id
            return (
              <li key={zone.id} style={{ borderTop: i === 0 ? 0 : '1px solid var(--c-line)' }}>
                <h2 style={{ margin: 0, fontSize: 'inherit' }}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`zone-${zone.id}`}
                    onClick={() => setOpenZone(isOpen ? undefined : zone.id)}
                    style={{
                      all: 'unset', boxSizing: 'border-box', cursor: 'pointer', width: '100%',
                      display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--space-3)', alignItems: 'center',
                      padding: 'var(--space-3) var(--space-4)', minHeight: 64,
                    }}
                  >
                    <span className="mono faint" style={{ width: 24 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span style={{ display: 'block', fontWeight: 600 }}>{zone.title}</span>
                      <span className="faint">{AREA_LABEL[zone.area]}{count > 0 ? ` · ${count} ملاحظة` : ''}{rec.photoIds.length > 0 ? ` · ${rec.photoIds.length} صورة` : ''}</span>
                    </span>
                    <span className={`chip chip--${rec.status}`}>{STATUS_LABEL[rec.status]}</span>
                  </button>
                </h2>
                {isOpen && (
                  <div id={`zone-${zone.id}`}>
                    <ZoneDetail zone={zone} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
