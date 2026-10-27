import { useEffect, useState } from 'react'
import { AddObservationForm } from '../checklist/AddObservationForm'
import { blobToDataUrl } from '../../lib/report'
import type { ZoneId } from '../../lib/types'

export interface PendingCapture {
  readonly blob: Blob
  readonly width?: number
  readonly height?: number
}

interface CaptureReviewProps {
  readonly capture: PendingCapture
  readonly zoneTitle: string
  readonly zoneId: ZoneId
  /** Persists the photo; resolves to its id. Called only after the user explicitly agrees. */
  readonly onSave: () => Promise<string>
  readonly onDiscard: () => void
  readonly onDone: () => void
}

export function CaptureReview({ capture, zoneTitle, zoneId, onSave, onDiscard, onDone }: CaptureReviewProps) {
  const [url, setUrl] = useState<string>()
  const [savedId, setSavedId] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    blobToDataUrl(capture.blob)
      .then((u) => !cancelled && setUrl(u))
      .catch((err: unknown) => console.error('Failed to preview capture', err))
    return () => {
      cancelled = true
    }
  }, [capture.blob])

  const save = async () => {
    setSaving(true)
    setError(undefined)
    try {
      setSavedId(await onSave())
    } catch (err) {
      console.error('Failed to save photo', err)
      setError('تعذّر حفظ الصورة على الجهاز. قد تكون مساحة التخزين ممتلئة.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label="مراجعة الصورة" style={{ maxHeight: '92dvh', overflowY: 'auto' }}>
        <h2>مراجعة الصورة</h2>
        {url && <img src={url} alt="الصورة الملتقطة" style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block', marginBottom: 'var(--space-3)' }} />}
        {!savedId ? (
          <>
            <p className="muted">
              الصورة موجودة في ذاكرة الصفحة فقط ولم تُحفظ ولم تُرسل لأي مكان. هل تريد حفظها على هذا الجهاز وربطها بمنطقة «{zoneTitle}»؟
            </p>
            {error && <p role="alert" style={{ color: 'var(--c-red)' }}>{error}</p>}
            <div className="btn-row">
              <button type="button" className="btn btn--primary" onClick={() => void save()} disabled={saving}>
                {saving ? 'جارٍ الحفظ…' : 'حفظ على هذا الجهاز'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onDiscard} disabled={saving}>
                تجاهل الصورة
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="muted">تم حفظ الصورة محليًا. صِف ما تراه فيها إن كان مريبًا، أو أنهِ بدون ملاحظة.</p>
            <AddObservationForm zoneId={zoneId} photoId={savedId} onAdded={onDone} submitLabel="حفظ الملاحظة مع الصورة" />
            <button type="button" className="btn btn--ghost btn--block" style={{ marginTop: 'var(--space-2)' }} onClick={onDone}>
              إنهاء بدون ملاحظة
            </button>
          </>
        )}
      </div>
    </div>
  )
}
