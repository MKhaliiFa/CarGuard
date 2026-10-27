import { useId, useState } from 'react'
import { arabicLabel, ELECTRONIC_CLASSES } from './labels'
import { REFERENCE_PRESETS, WEIGHT_UNAVAILABLE, pixelSize, type Calibration, type SizeEstimate } from './measure'
import { TRACK_STATE_LABEL, type Track } from './tracker'

interface DetectionDetailsProps {
  readonly track: Track
  readonly estimate?: SizeEstimate
  readonly calibration?: Calibration
  readonly calibrationValid: boolean
  readonly onCalibrate: (widthCm: number, name: string) => string | undefined
  readonly onReview: () => void
  readonly onClose: () => void
}

export function DetectionDetails({ track, estimate, calibration, calibrationValid, onCalibrate, onReview, onClose }: DetectionDetailsProps) {
  const { widthPx, heightPx } = pixelSize(track.box)
  const [preset, setPreset] = useState(REFERENCE_PRESETS[0]!.id)
  const [customCm, setCustomCm] = useState('')
  const [calMessage, setCalMessage] = useState<string>()
  const presetId = useId()
  const customId = useId()

  const submitCalibration = () => {
    const p = REFERENCE_PRESETS.find((r) => r.id === preset)
    const cm = preset === 'custom' ? Number(customCm.replace(',', '.')) : (p?.widthCm ?? 0)
    const err = onCalibrate(cm, preset === 'custom' ? `مرجع بعرض ${cm} سم` : (p?.name ?? ''))
    setCalMessage(err ?? 'تمت المعايرة. القياسات صالحة فقط للأجسام على نفس مسافة المرجع وبنفس الكاميرا والتقريب.')
  }

  return (
    <section className="panel" aria-label="تفاصيل الجسم المحدد">
      <div className="panel-title">
        <h3>
          <span className="mono faint">#{track.id}</span> {arabicLabel(track.label)}
        </h3>
        <button type="button" className="btn btn--ghost" onClick={onClose}>إغلاق</button>
      </div>
      <dl className="kv">
        <dt>اسم الفئة في النموذج</dt>
        <dd>{track.label}</dd>
        <dt>درجة الثقة</dt>
        <dd>{Math.round(track.score * 100)}%</dd>
        <dt>حالة التتبع</dt>
        <dd style={{ fontFamily: 'var(--font-sans)', direction: 'rtl' }}>{TRACK_STATE_LABEL[track.state]}</dd>
        <dt>أبعاد الإطار بالبكسل</dt>
        <dd>{widthPx} × {heightPx} px</dd>
        <dt>الأبعاد التقريبية</dt>
        <dd style={{ fontFamily: estimate ? undefined : 'var(--font-sans)', direction: estimate ? undefined : 'rtl' }}>
          {estimate
            ? `${estimate.widthCm.toFixed(1)} ± ${estimate.widthErrCm.toFixed(1)} × ${estimate.heightCm.toFixed(1)} ± ${estimate.heightErrCm.toFixed(1)} cm`
            : 'غير متاحة بدون معايرة'}
        </dd>
        <dt>الوزن</dt>
        <dd style={{ fontFamily: 'var(--font-sans)', direction: 'rtl' }}>{WEIGHT_UNAVAILABLE}</dd>
      </dl>
      <p className="faint" style={{ marginTop: 'var(--space-2)' }}>
        رقم التتبع يعني فقط أن الإطار يبدو نفس إطار اللقطات السابقة، ولا يثبت هوية الجسم. اسم الفئة تخمين من النموذج وقد يكون خاطئًا.
      </p>
      {calibration && !calibrationValid && (
        <p className="faint">المعايرة السابقة لم تعد صالحة لأن الكاميرا أو التقريب تغيّر.</p>
      )}
      {ELECTRONIC_CLASSES.has(track.label) && (
        <p className="faint">هذه الفئة جهاز إلكتروني عام. إن لم يكن من أغراضك أو من قطع السيارة، راجعه يدويًا.</p>
      )}

      <div className="btn-row" style={{ marginBottom: 'var(--space-3)' }}>
        <button type="button" className="btn btn--primary" onClick={onReview}>تعليم للمراجعة اليدوية</button>
      </div>

      <details>
        <summary className="btn btn--ghost btn--block">استخدام هذا الجسم كمرجع للقياس</summary>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <p className="faint">
            أمسك جسمًا معروف المقاس موازيًا للكاميرا وعلى نفس مسافة الأجسام التي تريد قياسها، واجعل الضلع المعروف أفقيًا في الصورة.
          </p>
          <div className="field">
            <label htmlFor={presetId}>جسم المرجع</label>
            <select id={presetId} className="input" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {REFERENCE_PRESETS.map((r) => (
                <option key={r.id} value={r.id}>{r.name} — {r.widthCm} سم</option>
              ))}
              <option value="custom">مقاس آخر أعرفه</option>
            </select>
          </div>
          {preset === 'custom' && (
            <div className="field">
              <label htmlFor={customId}>العرض الحقيقي بالسنتيمتر</label>
              <input id={customId} className="input" inputMode="decimal" value={customCm} onChange={(e) => setCustomCm(e.target.value)} />
            </div>
          )}
          <button type="button" className="btn btn--block" onClick={submitCalibration}>معايرة</button>
          {calMessage && <p role="status" style={{ marginTop: 'var(--space-2)' }}>{calMessage}</p>}
        </div>
      </details>
    </section>
  )
}
