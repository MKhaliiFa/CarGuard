import type { ReactNode } from 'react'

interface CalloutProps {
  readonly tone?: 'info' | 'warn' | 'danger' | 'ok'
  readonly title?: string
  readonly children: ReactNode
  readonly role?: 'alert' | 'status'
}

export function Callout({ tone = 'info', title, children, role }: CalloutProps) {
  return (
    <div className={`callout callout--${tone}`} role={role}>
      {title && <strong>{title}</strong>}
      {children}
    </div>
  )
}
