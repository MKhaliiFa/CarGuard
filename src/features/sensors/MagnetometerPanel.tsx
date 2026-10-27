import { useState } from 'react'
import { Callout } from '../../components/Callout'
import { Sparkline } from '../../components/Sparkline'
import { ZoneSelect } from '../../components/ZoneSelect'
import { newId } from '../../lib/ids'
import { CLASSIFICATION_LABEL, formatDateTime } from '../../lib/labels'
import { MIN_SAMPLES, classifyMagneticDelta, computeStats, describeStability } from '../../lib/magnetics'
import { getZone } from '../../lib/zones'
import type { ZoneId } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'
import { MagnetometerUnsupported } from './MagnetometerUnsupported'
import { SENSOR_ERROR_TEXT, useMagnetometer } from './useMagnetometer'

export const SAMPLE_DURATION_MS = 5000
const STABILITY_LABEL = { stable: 'مستقرة', moderate: 'متذبذبة قليلًا', unstable: 'غير مستقرة' } as const

export function MagnetometerPanel() {
  const mag = useMagnetometer()
  const { state, dispatch } = useInspection()
  const [zoneId, setZoneId] = useState<ZoneId>('dashboard-fuse')
  const [busy, setBusy] = useState<'baseline' | 'zone'>()
  const [message, setMessage] = useState<string>()
  const baseline = state.magneticBaseline
  const recentStats = computeStats(mag.history.slice(-20))

  const recordBaseline = async () => {
    setBusy('baseline')
    setMessage(undefined)
    const stats = computeStats(await mag.sample(SAMPLE_DURATION_MS))
    setBusy(undefined)
    if (!stats || stats.count < MIN_SAMPLES) return setMessage('لم تصل قراءات كافية من المستشعر خلال فترة القياس. لم يُسجَّل خط أساس.')
    dispatch({
      type: 'setBaseline',
      baseline: { meanMicroTesla: stats.mean, noiseMicroTesla: stats.stdDev, sampleCount: stats.count, at: new Date().toISOString() },
    })
    setMessage(`تم تسجيل خط الأساس من ${stats.count} قراءة.`)
  }

  const recordZone = async () => {
    if (!baseline) return
    setBusy('zone')
    setMessage(undefined)
    const stats = computeStats(await mag.sample(SAMPLE_DURATION_MS))
    setBusy(undefined)
    if (!stats || stats.count < MIN_SAMPLES) return setMessage('لم تصل قراءات كافية من المستشعر. لم يُسجَّل أي قياس.')
    const delta = stats.mean - baseline.meanMicroTesla
    const classification = classifyMagneticDelta(delta, baseline.noiseMicroTesla, stats.count)
    dispatch({
      type: 'addObservation',
      observation: {
        id: newId('obs'),
        zoneId,
        kind: 'magnetic',
        source: 'sensor',
        classification,
        text:
          classification === 'suspicious'
            ? 'تغيّر مغناطيسي واضح عن خط الأساس. قد يكون سببه معدن السيارة أو سماعة أو موتور أو مغناطيس. افحص المكان بصريًا.'
            : 'لا يوجد تغيّر مغناطيسي واضح عن خط الأساس. هذا لا ينفي وجود جهاز.',
        createdAt: new Date().toISOString(),
        magnetic: {
          baselineMicroTesla: baseline.meanMicroTesla,
          baselineNoiseMicroTesla: baseline.noiseMicroTesla,
          meanMicroTesla: stats.mean,
          deltaMicroTesla: delta,
          sampleCount: stats.count,
        },
      },
    })
    setMessage(`تم تسجيل قياس «${getZone(zoneId).title}»: ${CLASSIFICATION_LABEL[classification]}.`)
  }

  const magneticObs = state.observations.filter((o) => o.kind === 'magnetic' && o.magnetic)

  if (!mag.supported) return <MagnetometerUnsupported />

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-title">
          <h2>القراءة الحية</h2>
          {mag.status === 'running' ? (
            <button type="button" className="btn btn--ghost" onClick={mag.stop}>إيقاف</button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => void mag.start()} disabled={mag.status === 'starting'}>
              {mag.status === 'starting' ? 'جارٍ التشغيل…' : 'تشغيل المستشعر'}
            </button>
          )}
        </div>
        {mag.status === 'error' && mag.error && (
          <Callout tone="danger" role="alert" title="تعذّر قراءة المستشعر"><p>{SENSOR_ERROR_TEXT[mag.error]}</p></Callout>
        )}
        {mag.latest ? (
          <>
            <div className="readout" aria-live="polite">{mag.latest.magnitude.toFixed(1)}<small>µT</small></div>
            <Sparkline values={mag.history} baseline={baseline?.meanMicroTesla} label="تغيّر شدة المجال المغناطيسي مع الوقت" />
            <dl className="kv">
              <dt>X / Y / Z</dt>
              <dd>{mag.latest.x.toFixed(1)} / {mag.latest.y.toFixed(1)} / {mag.latest.z.toFixed(1)} µT</dd>
              <dt>الاستقرار</dt>
              <dd>{recentStats ? `${STABILITY_LABEL[describeStability(recentStats.stdDev)]} (σ ${recentStats.stdDev.toFixed(2)})` : '—'}</dd>
              {baseline && (
                <>
                  <dt>الفرق عن خط الأساس</dt>
                  <dd>{(mag.latest.magnitude - baseline.meanMicroTesla).toFixed(1)} µT</dd>
                </>
              )}
            </dl>
          </>
        ) : (
          mag.status !== 'error' && <p className="faint">لا توجد قراءات بعد. لن يعرض التطبيق أي رقم قبل وصول قراءة حقيقية من المستشعر.</p>
        )}
      </div>

      <div className="panel">
        <h2>١. خط الأساس</h2>
        <p className="muted">
          اجلس في منتصف المقصورة، وأمسك الهاتف ثابتًا بعيدًا عن السماعات والمعادن، ثم اضغط «تسجيل خط الأساس». يستغرق القياس خمس ثوانٍ.
        </p>
        {baseline && (
          <p className="faint">
            خط الأساس الحالي <span className="mono">{baseline.meanMicroTesla.toFixed(1)} µT</span> (σ{' '}
            <span className="mono">{baseline.noiseMicroTesla.toFixed(2)}</span>) · {formatDateTime(baseline.at)}
          </p>
        )}
        <button type="button" className="btn btn--block" disabled={mag.status !== 'running' || busy !== undefined} onClick={() => void recordBaseline()}>
          {busy === 'baseline' ? 'جارٍ القياس… لا تحرك الهاتف' : 'تسجيل خط الأساس'}
        </button>
      </div>

      <div className="panel">
        <h2>٢. مقارنة المناطق</h2>
        <p className="muted">ضع الهاتف بنفس الاتجاه قرب المنطقة المطلوبة ثم سجّل قياسًا. حافظ على اتجاه الهاتف ثابتًا بين القياسات قدر الإمكان.</p>
        <ZoneSelect value={zoneId} onChange={setZoneId} />
        <button type="button" className="btn btn--primary btn--block" disabled={!baseline || mag.status !== 'running' || busy !== undefined} onClick={() => void recordZone()}>
          {busy === 'zone' ? 'جارٍ القياس…' : 'تسجيل قياس لهذه المنطقة'}
        </button>
        {!baseline && <p className="faint" style={{ marginTop: 'var(--space-2)' }}>سجّل خط الأساس أولًا.</p>}
        {message && <p role="status" style={{ marginTop: 'var(--space-3)' }}>{message}</p>}
      </div>

      {magneticObs.length > 0 && (
        <div className="panel panel--flush">
          <h2 style={{ padding: 'var(--space-4) var(--space-4) 0' }}>القياسات المسجلة</h2>
          <ul className="list-reset row-list">
            {magneticObs.map((o) => (
              <li key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <span>{getZone(o.zoneId).title}</span>
                <span className="mono">Δ {o.magnetic!.deltaMicroTesla.toFixed(1)} µT</span>
                <span className={`chip chip--${o.classification}`}>{CLASSIFICATION_LABEL[o.classification]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <MagneticCaveats />
    </div>
  )
}

export function MagneticCaveats() {
  return (
    <Callout tone="warn" title="ماذا تعني هذه الأرقام وما لا تعنيه">
      <ul>
        <li>هيكل السيارة المعدني والسماعات والمواتير والأسلاك والمغناطيسات كلها تغيّر القراءة.</li>
        <li>تدوير الهاتف وحده قد يغيّر القراءة بعشرات الميكروتسلا.</li>
        <li>أغلب أجهزة التتبع لا تصدر مجالًا مغناطيسيًا مميزًا. المغناطيس الذي يثبّتها قد يظهر وقد لا يظهر.</li>
        <li>أفضل نتيجة يمكن أن يعطيها هذا القياس هي «مؤشر مشتبه به» يدعوك للفحص البصري. لا يحدد مكان جهاز ولا يثبت وجوده.</li>
      </ul>
    </Callout>
  )
}
