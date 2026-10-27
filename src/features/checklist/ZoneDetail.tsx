import { useId } from 'react'
import { Callout } from '../../components/Callout'
import { PhotoThumb } from '../../components/PhotoThumb'
import { deletePhoto } from '../../lib/storage'
import { STATUS_LABEL, formatDateTime } from '../../lib/labels'
import type { ZoneDefinition } from '../../lib/zones'
import type { ZoneStatus } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'
import { AddObservationForm } from './AddObservationForm'
import { ObservationList } from './ObservationList'

const STATUSES: ZoneStatus[] = ['not_inspected', 'inspected', 'needs_followup']

interface ZoneDetailProps {
  readonly zone: ZoneDefinition
}

export function ZoneDetail({ zone }: ZoneDetailProps) {
  const { state, dispatch } = useInspection()
  const record = state.zones[zone.id]
  const observations = state.observations.filter((o) => o.zoneId === zone.id)
  const notesId = useId()

  const removePhoto = async (photoId: string) => {
    dispatch({ type: 'detachPhoto', zoneId: zone.id, photoId, at: new Date().toISOString() })
    await deletePhoto(photoId).catch((err: unknown) => console.error('Failed to delete photo', err))
  }

  return (
    <div className="stack" style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--c-line)' }}>
      <section aria-label="ما الذي تفحصه">
        <h3>ما الذي تفحصه</h3>
        <ul>{zone.whatToCheck.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>
      <Callout tone="warn" title="حدود السلامة">
        <ul style={{ margin: 0 }}>{zone.safety.map((t) => <li key={t}>{t}</li>)}</ul>
      </Callout>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>حالة المنطقة</legend>
        <div className="segmented">
          {STATUSES.map((s) => (
            <label key={s}>
              <input
                type="radio"
                name={`status-${zone.id}`}
                value={s}
                checked={record.status === s}
                onChange={() => dispatch({ type: 'setZoneStatus', zoneId: zone.id, status: s, at: new Date().toISOString() })}
              />
              <span>{STATUS_LABEL[s]}</span>
            </label>
          ))}
        </div>
        <p className="faint" style={{ marginTop: 'var(--space-1)' }}>
          وقت الفحص: {formatDateTime(record.inspectedAt)}
        </p>
      </fieldset>

      <div className="field">
        <label htmlFor={notesId}>ملاحظات عامة (اختياري)</label>
        <textarea
          id={notesId}
          className="input"
          maxLength={4000}
          value={record.notes}
          onChange={(e) => dispatch({ type: 'setZoneNotes', zoneId: zone.id, notes: e.target.value, at: new Date().toISOString() })}
        />
      </div>

      <section aria-label="الصور">
        <div className="panel-title">
          <h3>الصور ({record.photoIds.length})</h3>
          <a className="btn" href={`#/camera?zone=${zone.id}`}>التقاط صورة لهذه المنطقة</a>
        </div>
        {record.photoIds.length === 0 ? (
          <p className="faint">لا توجد صور محفوظة. الصور تُحفظ على جهازك فقط وبعد موافقتك.</p>
        ) : (
          <ul className="list-reset" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {record.photoIds.map((p) => (
              <li key={p} style={{ display: 'grid', gap: 4 }}>
                <PhotoThumb photoId={p} alt={`صورة من ${zone.title}`} />
                <button type="button" className="btn btn--ghost" style={{ minHeight: 32, padding: '2px 8px' }} onClick={() => void removePhoto(p)}>
                  حذف
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="الملاحظات">
        <h3>الملاحظات المسجلة ({observations.length})</h3>
        <ObservationList observations={observations} />
      </section>

      <details>
        <summary className="btn btn--ghost btn--block">إضافة ملاحظة مكتوبة</summary>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <AddObservationForm zoneId={zone.id} />
        </div>
      </details>
    </div>
  )
}
