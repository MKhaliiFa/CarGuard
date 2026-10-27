import type { ReactNode } from 'react'

interface PageHeadProps {
  readonly eyebrow: string
  readonly title: string
  readonly children?: ReactNode
}

export function PageHead({ eyebrow, title, children }: PageHeadProps) {
  return (
    <header className="page-head">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {children && <div className="lede">{children}</div>}
    </header>
  )
}
