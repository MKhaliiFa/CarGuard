import { useId, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ZoneSelect } from '../../components/ZoneSelect'
import { newId } from '../../lib/ids'
import { CLASSIFICATION_HINT, CLASSIFICATION_LABEL } from '../../lib/labels'
import { savePhoto } from '../../lib/storage'
import type { Classification, DetectionSnapshot, ZoneId } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'

export const SMALL_ELECTRONICS_CHECKS: readonly string[] = [
  'موصول بسلك بكهرباء السيارة أو بمنفذ التشخيص',
  'مثبّت بمغناطيس أو شريط لاصق أو أربطة بلاستيكية حديثة',
  'عليه ضوء صغير أو مؤشر يومض',
  'فيه فتحة شريحة اتصال أو هوائي',
  'فيه ثقب صغير قد يكون لميكروفون',
  'لا يحمل علامة الشركة المصنّعة للسيارة',
  'مكانه غير منطقي لقطعة أصلية',
]

interface ManualReviewFormProps {
  readonly defaultZone: ZoneId
  readonly detection?: DetectionSnapshot
  readonly captureFrame: () => Promise<{ blob: Blob; width: number; height: number } | undefined>
  readonly onDone: (message: string) => void
  readonly onCancel: () => void
}

export function ManualReviewForm({ defaultZone, detection, captureFrame, onDone, onCancel }: ManualReviewFormProps) {
  const { dispatch } = useInspection()
  const [zoneId, setZoneId] = useState<ZoneId>(defaultZone)
  const [checks, setChecks] = useState<readonly string[]>([])
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [classification, setClassification] = useState<Classification>('suspicious')
  const [withPhoto, setWithPhoto] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string>()
  const locId = useId()
  const noteId = useId()

  const toggle = (c: string) => setChecks((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))

  const save = async () => {
    setConfirming(false)
    setError(undefined)
    const at = new Date().toISOString()
    let photoId: string | undefined
    try {
      if (withPhoto) {
        const frame = await captureFrame()
        if (!frame) return setError('تعذّر التقاط صورة من الكاميرا. تأكد أن الكاميرا ما زالت تعمل.')
        photoId = newId('photo')
        await savePhoto({ id: photoId, zoneId, blob: frame.blob, createdAt: at, width: frame.width, height: frame.height })
        dispatch({ type: 'attachPhoto', zoneId, photoId, at })
      }
      const label = detection ? `جسم صنّفه النموذج «${detection.labelAr}»` : 'جسم صغير لم يصنّفه النموذج'
      dispatch({
        type: 'addObservation',
        observation: {
          id: newId('obs'),
          zoneId,
          kind: 'visual',
          source: 'user',
          classification,
          text: [label, location.trim() && `المكان: ${location.trim()}`, note.trim()].filter(Boolean).join('. '),
          createdAt: at,
          photoId,
          detection,
          review: { checks, location: location.trim() },
        },
      })
      onDone('تم حفظ المراجعة اليدوية على هذا الجهاز.')
    } catch (err) {
      console.error('Failed to save review', err)
      setError('تعذّر الحفظ على الجهاز. قد تكون مساحة التخزين ممتلئة.')
    }
  }

  return (
    <section className="panel" aria-label="مراجعة يدوية" style={{ background: 'var(--c-bg-raised)' }}>
      <h3>مراجعة يدوية لجسم إلكتروني صغير</h3>
      <p className="faint">
        النموذج لا يعرف أجهزة التتبع أو التسجيل، لأنها ليست من الفئات التي تدرّب عليها. هذه القائمة تساعدك على تقييم الجسم بنفسك.
      </p>
      <ZoneSelect value={zoneId} onChange={setZoneId} label="المنطقة" />
      <div className="field">
        <label htmlFor={locId}>المكان الدقيق داخل المنطقة</label>
        <input id={locId} className="input" maxLength={300} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثال: خلف غطاء الفيوزات، يسار منفذ التشخيص بحوالي ١٠ سم" />
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>ماذا ترى؟</legend>
        {SMALL_ELECTRONICS_CHECKS.map((c) => (
          <label key={c} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', padding: '4px 0' }}>
            <input type="checkbox" checked={checks.includes(c)} onChange={() => toggle(c)} style={{ marginTop: 6 }} />
            <span>{c}</span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor={noteId}>ملاحظات إضافية</label>
        <textarea id={noteId} className="input" maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>تقييمك</legend>
        {(['suspicious', 'confirmed', 'inconclusive'] as const).map((c) => (
          <label key={c} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', padding: '4px 0' }}>
            <input type="radio" name={`review-cls-${locId}`} checked={classification === c} onChange={() => setClassification(c)} style={{ marginTop: 6 }} />
            <span>
              <span className={`chip chip--${c}`}>{CLASSIFICATION_LABEL[c]}</span>
              <span className="faint" style={{ display: 'block' }}>{CLASSIFICATION_HINT[c]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <input type="checkbox" checked={withPhoto} onChange={(e) => setWithPhoto(e.target.checked)} />
        إرفاق لقطة من الكاميرا الآن
      </label>
      {error && <p role="alert" style={{ color: 'var(--c-red)' }}>{error}</p>}
      <div className="btn-row">
        <button type="button" className="btn btn--primary" onClick={() => setConfirming(true)}>حفظ المراجعة</button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>إلغاء</button>
      </div>
      <ConfirmDialog open={confirming} title="حفظ على هذا الجهاز؟" confirmLabel="حفظ" onConfirm={() => void save()} onCancel={() => setConfirming(false)}>
        <p>{withPhoto ? 'ستُلتقط صورة من الكاميرا وتُحفظ مع الملاحظة على هذا الجهاز فقط.' : 'ستُحفظ الملاحظة على هذا الجهاز فقط، بدون صورة.'} لن يُرسل شيء لأي مكان.</p>
      </ConfirmDialog>
    </section>
  )
}
