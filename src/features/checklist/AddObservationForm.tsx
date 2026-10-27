import { useId, useState, type FormEvent } from 'react'
import { newId } from '../../lib/ids'
import { CLASSIFICATION_HINT, CLASSIFICATION_LABEL } from '../../lib/labels'
import type { Classification, ZoneId } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'

const MAX_TEXT = 2000

interface AddObservationFormProps {
  readonly zoneId: ZoneId
  readonly photoId?: string
  readonly onAdded?: () => void
  readonly submitLabel?: string
}

export function AddObservationForm({ zoneId, photoId, onAdded, submitLabel = 'إضافة الملاحظة' }: AddObservationFormProps) {
  const { dispatch } = useInspection()
  const [text, setText] = useState('')
  const [classification, setClassification] = useState<Classification>('suspicious')
  const textId = useId()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim().slice(0, MAX_TEXT)
    if (!trimmed && !photoId) return
    dispatch({
      type: 'addObservation',
      observation: {
        id: newId('obs'),
        zoneId,
        kind: photoId ? 'visual' : 'note',
        source: 'user',
        classification,
        text: trimmed,
        createdAt: new Date().toISOString(),
        photoId,
      },
    })
    setText('')
    onAdded?.()
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor={textId}>ماذا لاحظت؟</label>
        <textarea
          id={textId}
          className="input"
          maxLength={MAX_TEXT}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="مثال: علبة سوداء صغيرة ملتصقة خلف الصدام الخلفي، عليها شريط لاصق حديث"
        />
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>تصنيف الملاحظة</legend>
        {(['suspicious', 'confirmed', 'inconclusive'] as const).map((c) => (
          <label key={c} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', padding: '6px 0' }}>
            <input type="radio" name={`cls-${textId}`} value={c} checked={classification === c} onChange={() => setClassification(c)} style={{ marginTop: 6 }} />
            <span>
              <span className={`chip chip--${c}`}>{CLASSIFICATION_LABEL[c]}</span>
              <span className="faint" style={{ display: 'block' }}>{CLASSIFICATION_HINT[c]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <button type="submit" className="btn btn--primary btn--block" disabled={!text.trim() && !photoId}>
        {submitLabel}
      </button>
    </form>
  )
}
