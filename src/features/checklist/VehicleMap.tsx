import { STATUS_LABEL } from '../../lib/labels'
import type { ZoneId, ZoneStatus } from '../../lib/types'
import { ZONES } from '../../lib/zones'
import { useInspection } from '../../state/InspectionContext'

type Shape = { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly r?: number }

interface ZoneArt {
  readonly shapes: readonly Shape[]
  /** Where the zone's number label sits. */
  readonly label: readonly [number, number]
}

/** Top-down car, front at the top, driver on the left (left-hand drive). Coordinates in a 220×440 box. */
const ART: Record<ZoneId, ZoneArt> = {
  'grille-engine': { shapes: [{ x: 50, y: 30, w: 120, h: 72, r: 16 }], label: [80, 66] },
  'battery-wiring': { shapes: [{ x: 128, y: 52, w: 32, h: 28, r: 6 }], label: [144, 66] },
  exterior: {
    shapes: [
      { x: 44, y: 10, w: 132, h: 12, r: 6 },
      { x: 44, y: 418, w: 132, h: 12, r: 6 },
      { x: 14, y: 84, w: 14, h: 50, r: 6 },
      { x: 192, y: 84, w: 14, h: 50, r: 6 },
      { x: 14, y: 320, w: 14, h: 50, r: 6 },
      { x: 192, y: 320, w: 14, h: 50, r: 6 },
    ],
    label: [110, 16],
  },
  underbody: { shapes: [{ x: 20, y: 150, w: 10, h: 156, r: 5 }, { x: 190, y: 150, w: 10, h: 156, r: 5 }], label: [25, 228] },
  'dashboard-fuse': { shapes: [{ x: 50, y: 118, w: 120, h: 22, r: 8 }], label: [150, 129] },
  obd: { shapes: [{ x: 64, y: 140, w: 22, h: 18, r: 9 }], label: [75, 149] },
  'front-seats': { shapes: [{ x: 50, y: 164, w: 46, h: 56, r: 12 }, { x: 124, y: 164, w: 46, h: 56, r: 12 }], label: [73, 192] },
  'console-storage': { shapes: [{ x: 101, y: 150, w: 18, h: 92, r: 7 }], label: [110, 196] },
  'seat-undersides': { shapes: [{ x: 50, y: 226, w: 120, h: 14, r: 6 }], label: [110, 233] },
  'rear-seats': { shapes: [{ x: 50, y: 250, w: 120, h: 58, r: 14 }], label: [110, 279] },
  'trunk-spare': { shapes: [{ x: 50, y: 334, w: 120, h: 74, r: 16 }], label: [110, 371] },
}

const BODY =
  'M110 6C160 6 186 20 191 58L198 140V330L191 392C186 426 160 434 110 434S34 426 29 392L22 330V140L29 58C34 20 60 6 110 6Z'

interface VehicleMapProps {
  readonly selected?: ZoneId
  readonly onSelect: (id: ZoneId) => void
}

/**
 * Visual entry point to the checklist. It is a pointer shortcut only: every zone is also a real button in the
 * list below, which stays the accessible path, so the drawing is hidden from assistive tech.
 */
export function VehicleMap({ selected, onSelect }: VehicleMapProps) {
  const { state } = useInspection()
  const count = (s: ZoneStatus) => ZONES.filter((z) => state.zones[z.id].status === s).length

  return (
    <figure className="vmap">
      <div className="vmap-stage">
        <svg viewBox="0 0 220 440" className="vmap-svg" aria-hidden="true">
          <defs>
            <linearGradient id="vmap-body" x1="0" x2="1">
              <stop offset="0" stopColor="#141b1c" />
              <stop offset="0.5" stopColor="#1b2526" />
              <stop offset="1" stopColor="#141b1c" />
            </linearGradient>
          </defs>
          <path d={BODY} className="vmap-body" fill="url(#vmap-body)" />
          <path className="vmap-glass" d="M52 108C70 98 150 98 168 108M56 316C74 324 146 324 164 316" />
          <circle className="vmap-spare" cx="110" cy="371" r="22" />
          {ZONES.map((zone, i) => {
            const art = ART[zone.id]
            const status = state.zones[zone.id].status
            return (
              <g
                key={zone.id}
                className={`vmap-zone is-${status}${selected === zone.id ? ' is-selected' : ''}`}
                onClick={() => onSelect(zone.id)}
              >
                <title>{zone.title}</title>
                {art.shapes.map((s, j) => (
                  <rect key={j} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 6} />
                ))}
                <text x={art.label[0]} y={art.label[1]} dy="0.35em">{String(i + 1).padStart(2, '0')}</text>
              </g>
            )
          })}
        </svg>
        <span className="vmap-front" aria-hidden="true">الأمام</span>
      </div>
      <figcaption className="vmap-legend">
        <span className="is-inspected"><i />{STATUS_LABEL.inspected} <b className="mono">{count('inspected')}</b></span>
        <span className="is-needs_followup"><i />{STATUS_LABEL.needs_followup} <b className="mono">{count('needs_followup')}</b></span>
        <span className="is-not_inspected"><i />{STATUS_LABEL.not_inspected} <b className="mono">{count('not_inspected')}</b></span>
      </figcaption>
    </figure>
  )
}
