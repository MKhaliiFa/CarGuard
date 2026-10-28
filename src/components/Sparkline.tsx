import { useId } from 'react'

interface SparklineProps {
  readonly values: readonly number[]
  readonly baseline?: number
  readonly label: string
}

const W = 100
const H = 40

/** Draws only the readings it is given; renders nothing until there are at least two real samples. */
export function Sparkline({ values, baseline, label }: SparklineProps) {
  const fillId = useId()
  if (values.length < 2) return null
  const all = baseline !== undefined ? [...values, baseline] : values
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const y = (v: number) => H - ((v - min) / span) * (H - 6) - 3
  const x = (i: number) => (i / (values.length - 1)) * W
  const points = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`)
  const line = `M${points.join(' L')}`
  const area = `${line} L${W},${H} L0,${H} Z`
  const lastY = y(values.at(-1) ?? min)

  return (
    <div className="spark-wrap" style={{ direction: 'ltr' }}>
      <div className="spark-plot">
        <svg className="sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
          <defs>
            <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--c-focus)" stopOpacity="0.28" />
              <stop offset="1" stopColor="var(--c-focus)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${fillId})`} stroke="none" />
          {baseline !== undefined && <line className="baseline" x1="0" x2={W} y1={y(baseline)} y2={y(baseline)} stroke="currentColor" />}
          <path className="spark-line" d={line} />
        </svg>
        <span className="spark-dot" style={{ left: '100%', top: `${(lastY / H) * 100}%` }} aria-hidden="true" />
      </div>
      <div className="spark-legend" aria-hidden="true">
        <span><i />القراءة الحية</span>
        {baseline !== undefined && <span><i className="is-baseline" />خط الأساس</span>}
      </div>
    </div>
  )
}
