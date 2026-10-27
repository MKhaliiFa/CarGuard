import { CLASSIFICATION_LABEL, formatDateTime } from '../../lib/labels'
import type { Classification, Observation } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'
import { PhotoThumb } from '../../components/PhotoThumb'

const SOURCE_LABEL: Record<Observation['source'], string> = {
  user: 'ملاحظتك',
  sensor: 'قياس المستشعر',
  bluetooth: 'فحص البلوتوث',
}

interface ObservationListProps {
  readonly observations: readonly Observation[]
}

export function ObservationList({ observations }: ObservationListProps) {
  const { dispatch } = useInspection()
  if (observations.length === 0) return <p className="faint">لا توجد ملاحظات مسجلة لهذه المنطقة بعد.</p>

  return (
    <ul className="list-reset stack">
      {observations.map((o) => {
        const options: Classification[] = o.source === 'user' ? ['confirmed', 'suspicious', 'inconclusive'] : ['suspicious', 'inconclusive']
        return (
          <li key={o.id} className="panel" style={{ background: 'var(--c-bg-raised)' }}>
            <div className="panel-title">
              <span className={`chip chip--${o.classification}`}>{CLASSIFICATION_LABEL[o.classification]}</span>
              <span className="faint">{SOURCE_LABEL[o.source]} · {formatDateTime(o.createdAt)}</span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              {o.photoId && <PhotoThumb photoId={o.photoId} alt="صورة الملاحظة" size={64} />}
              <p style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{o.text || 'بدون وصف'}</p>
            </div>
            {o.magnetic && (
              <p className="faint">
                متوسط القراءة <span className="mono">{o.magnetic.meanMicroTesla.toFixed(1)} µT</span>، خط الأساس{' '}
                <span className="mono">{o.magnetic.baselineMicroTesla.toFixed(1)} µT</span>، الفرق{' '}
                <span className="mono">{o.magnetic.deltaMicroTesla.toFixed(1)} µT</span>، عدد العينات{' '}
                <span className="mono">{o.magnetic.sampleCount}</span>
              </p>
            )}
            <div className="btn-row">
              <label className="visually-hidden" htmlFor={`cls-${o.id}`}>تصنيف الملاحظة</label>
              <select
                id={`cls-${o.id}`}
                className="input"
                style={{ width: 'auto', flex: 1 }}
                value={o.classification}
                onChange={(e) => dispatch({ type: 'reclassifyObservation', id: o.id, classification: e.target.value as Classification })}
              >
                {options.map((c) => (
                  <option key={c} value={c}>{CLASSIFICATION_LABEL[c]}</option>
                ))}
              </select>
              <button type="button" className="btn btn--ghost" onClick={() => dispatch({ type: 'removeObservation', id: o.id })}>
                حذف
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
