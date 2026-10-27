interface SparklineProps {
  readonly values: readonly number[]
  readonly baseline?: number
  readonly label: string
}

export function Sparkline({ values, baseline, label }: SparklineProps) {
  if (values.length < 2) return null
  const all = baseline !== undefined ? [...values, baseline] : values
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const w = 100
  const h = 40
  const y = (v: number) => h - ((v - min) / span) * (h - 4) - 2
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (values.length - 1)) * w).toFixed(2)},${y(v).toFixed(2)}`).join(' ')
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={label} style={{ direction: 'ltr' }}>
      {baseline !== undefined && <line className="baseline" x1="0" x2={w} y1={y(baseline)} y2={y(baseline)} stroke="currentColor" />}
      <path d={d} />
    </svg>
  )
}
