import { useState, type ChangeEvent } from 'react'
import { Callout } from '../../components/Callout'
import { PageHead } from '../../components/PageHead'
import { ZoneSelect } from '../../components/ZoneSelect'
import { newId } from '../../lib/ids'
import { savePhoto } from '../../lib/storage'
import { ZONE_IDS, getZone } from '../../lib/zones'
import type { ZoneId } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'
import { CaptureReview, type PendingCapture } from './CaptureReview'
import { CAMERA_ERROR_TEXT, useCamera } from './useCamera'

function zoneFromHash(): ZoneId {
  const query = window.location.hash.split('?')[1] ?? ''
  const zone = new URLSearchParams(query).get('zone')
  return zone && (ZONE_IDS as readonly string[]).includes(zone) ? (zone as ZoneId) : 'obd'
}

export function CameraInspection() {
  const { videoRef, ...cam } = useCamera()
  const { dispatch } = useInspection()
  const [zoneId, setZoneId] = useState<ZoneId>(zoneFromHash)
  const [pending, setPending] = useState<PendingCapture>()
  const zone = getZone(zoneId)

  const onCapture = async () => {
    const shot = await cam.capture()
    if (shot) setPending(shot)
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file && file.type.startsWith('image/')) setPending({ blob: file })
  }

  const persist = async (): Promise<string> => {
    if (!pending) throw new Error('No pending capture')
    const id = newId('photo')
    const at = new Date().toISOString()
    await savePhoto({ id, zoneId, blob: pending.blob, createdAt: at, width: pending.width, height: pending.height })
    dispatch({ type: 'attachPhoto', zoneId, photoId: id, at })
    return id
  }

  return (
    <>
      <PageHead eyebrow="CAMERA" title="الفحص البصري بالكاميرا">
        <p>استخدم الكاميرا الخلفية والكشاف لرؤية الأماكن الضيقة والمظلمة. الصور تبقى على جهازك ولا تُرفع لأي خادم.</p>
      </PageHead>

      <div className="panel">
        <ZoneSelect value={zoneId} onChange={setZoneId} />
        <h3>ما الذي تبحث عنه هنا</h3>
        <ul>{zone.whatToCheck.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="faint">{zone.safety[0]}</p>
      </div>

      <div className="panel">
        {cam.status === 'unsupported' && (
          <Callout tone="warn" title="الكاميرا المباشرة غير مدعومة في هذا المتصفح">
            <p>يمكنك التقاط صورة بكاميرا الهاتف الأصلية ورفعها من الزر بالأسفل.</p>
          </Callout>
        )}

        {(cam.status === 'idle' || cam.status === 'error') && (
          <>
            <p className="muted">
              عند الضغط على «تشغيل الكاميرا» سيطلب المتصفح إذن استخدام الكاميرا فقط. لن نطلب الميكروفون، ولن يُسجَّل أي فيديو.
            </p>
            {cam.status === 'error' && cam.error && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <Callout tone="danger" role="alert" title="تعذّر تشغيل الكاميرا">
                  <p>{CAMERA_ERROR_TEXT[cam.error]}</p>
                </Callout>
              </div>
            )}
            <button type="button" className="btn btn--primary btn--block" onClick={() => void cam.start()}>
              تشغيل الكاميرا الخلفية
            </button>
          </>
        )}

        <div hidden={cam.status !== 'live' && cam.status !== 'starting'}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="معاينة الكاميرا"
            style={{ width: '100%', aspectRatio: '3 / 4', objectFit: 'cover', background: '#000', borderRadius: 'var(--radius-md)', display: 'block' }}
          />
          {cam.status === 'starting' && <p className="faint" role="status">جارٍ تشغيل الكاميرا…</p>}
          {cam.status === 'live' && (
            <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
              <div className="btn-row">
                <button type="button" className="btn btn--primary" style={{ flex: 2 }} onClick={() => void onCapture()}>
                  التقاط صورة
                </button>
                {cam.torchAvailable ? (
                  <button type="button" className="btn" aria-pressed={cam.torchOn} style={{ flex: 1 }} onClick={() => void cam.setTorch(!cam.torchOn)}>
                    {cam.torchOn ? 'إطفاء الكشاف' : 'تشغيل الكشاف'}
                  </button>
                ) : null}
                <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={cam.stop}>
                  إيقاف
                </button>
              </div>
              {!cam.torchAvailable && <p className="faint">الكشاف غير متاح من المتصفح على هذا الجهاز. استخدم كشاف هاتف آخر أو كشافًا يدويًا.</p>}
              {cam.zoomRange && cam.zoom !== undefined ? (
                <div className="field">
                  <label htmlFor="zoom">التقريب <span className="mono">{cam.zoom.toFixed(1)}×</span></label>
                  <input
                    id="zoom"
                    type="range"
                    min={cam.zoomRange.min}
                    max={cam.zoomRange.max}
                    step={cam.zoomRange.step}
                    value={cam.zoom}
                    onChange={(e) => void cam.setZoom(Number(e.target.value))}
                  />
                </div>
              ) : (
                <p className="faint">التقريب البصري غير متاح من المتصفح. اقترب بالهاتف أو كبّر الصورة بعد التقاطها.</p>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <label className="btn btn--block" htmlFor="file-capture">رفع صورة من كاميرا الهاتف</label>
          <input id="file-capture" type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={onFile} />
        </div>
      </div>

      <Callout title="حدود الفحص بالصور">
        <p>
          الصورة تساعدك على التوثيق والمقارنة فقط. لا يحلل التطبيق الصور تلقائيًا، ولا يمكن لصورة وحدها إثبات أن جسمًا ما جهاز تتبع أو تسجيل.
          كثير من القطع الأصلية في السيارات تبدو كعلب سوداء صغيرة.
        </p>
      </Callout>

      {pending && (
        <CaptureReview
          capture={pending}
          zoneId={zoneId}
          zoneTitle={zone.title}
          onSave={persist}
          onDiscard={() => setPending(undefined)}
          onDone={() => setPending(undefined)}
        />
      )}
    </>
  )
}
