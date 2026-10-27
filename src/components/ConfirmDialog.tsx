import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ConfirmDialogProps {
  readonly open: boolean
  readonly title: string
  readonly children: ReactNode
  readonly confirmLabel: string
  readonly cancelLabel?: string
  readonly tone?: 'primary' | 'danger'
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

/** In-app dialog; avoids window.confirm, which blocks the page and looks out of place in a PWA. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'إلغاء',
  tone = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId}>{title}</h2>
        <div className="muted">{children}</div>
        <div className="btn-row" style={{ marginTop: 'var(--space-5)' }}>
          <button type="button" className={`btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn--ghost" ref={cancelRef} onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
