import { useId } from 'react'
import { ZONES } from '../lib/zones'
import type { ZoneId } from '../lib/types'

interface ZoneSelectProps {
  readonly value: ZoneId
  readonly onChange: (zone: ZoneId) => void
  readonly label?: string
}

export function ZoneSelect({ value, onChange, label = 'منطقة الفحص' }: ZoneSelectProps) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value as ZoneId)}>
        {ZONES.map((z) => (
          <option key={z.id} value={z.id}>
            {z.title}
          </option>
        ))}
      </select>
    </div>
  )
}
