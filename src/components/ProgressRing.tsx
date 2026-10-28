import type { ReactNode } from 'react'

interface ProgressRingProps {
  /** 0..1 */
  readonly value: number
  readonly size?: number
  readonly label: string
  readonly children?: ReactNode
}

const STROKE = 7

/** Animated ring. The stroke offset transitions in CSS, so motion follows real progress changes only. */
export function ProgressRing({ value, size = 132, label, children }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, value))
  const r = (size - STROKE) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={STROKE} />
        <circle
          className="ring-value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={STROKE}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center" aria-hidden="true">{children}</div>
    </div>
  )
}
