import { useEffect, useState, type ChangeEvent } from 'react'
import { Callout } from '../../components/Callout'
import { IconCamera, IconCollapse, IconExpand, IconStop, IconTorch } from '../../components/icons'
import { PageHead } from '../../components/PageHead'
import { ZoneSelect } from '../../components/ZoneSelect'
import { newId } from '../../lib/ids'
import { savePhoto } from '../../lib/storage'
import { ZONE_IDS, getZone } from '../../lib/zones'
import type { ZoneId } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'
import type { DetectorLoader } from '../detection/detector'
import { LiveDetection } from '../detection/LiveDetection'
import { CaptureReview, type PendingCapture } from './CaptureReview'
import { CAMERA_ERROR_TEXT, useCamera } from './useCamera'

/** Keeps Latin tokens such as «OBD-II» on one line: a break at the hyphen scrambles bidi order in RTL. */
function KeepLatin({ text }: { readonly text: string }) {
  return text.split(/([A-Za-z0-9]+(?:-[A-Za-z0-9]+)+)/).map((part, i) => (i % 2 ? <span key={i} className="nobr">{part}</span> : part))
}

function zoneFromHash(): ZoneId {
  const query = window.location.hash.split('?')[1] ?? ''
  const zone = new URLSearchParams(query).get('zone')
  return zone && (ZONE_IDS as readonly string[]).includes(zone) ? (zone as ZoneId) : 'obd'
}

interface CameraInspectionProps {
  /** Injected in tests; production uses the real on-device model. */
  readonly detectorLoader?: DetectorLoader
}

/** Full-screen mode: lock page scroll and let Escape leave it. */
function useImmersive(active: boolean, setActive: (on: boolean) => void) {
  useEffect(() => {
    if (!active) return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [active, setActive])
}

const CornerMarks = () => (
  <>
    <span className="vf-corner" /><span className="vf-corner" /><span className="vf-corner" /><span className="vf-corner" />
  </>
)

export function CameraInspection({ detectorLoader }: CameraInspectionProps = {}) {
  const { videoRef, ...cam } = useCamera()
  const { dispatch } = useInspection()
  const [zoneId, setZoneId] = useState<ZoneId>(zoneFromHash)
  const [pending, setPending] = useState<PendingCapture>()
  const [immersive, setImmersive] = useState(false)
  const [flash, setFlash] = useState(0)
  const zone = getZone(zoneId)
  const live = cam.status === 'live'
  const showStage = live || cam.status === 'starting'

  useImmersive(immersive && showStage, setImmersive)

  const onCapture = async () => {
    const shot = await cam.capture()
    if (!shot) return
    setFlash((n) => n + 1)
    setPending(shot)
  }

  const onStop = () => {
    setImmersive(false)
    cam.stop()
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
        <p>الكاميرا الخلفية والكشاف يساعدانك على رؤية الأماكن الضيقة والمظلمة. الصور تبقى على جهازك ولا تُرفع لأي خادم.</p>
      </PageHead>

      <div className="panel cam-target">
        <ZoneSelect value={zoneId} onChange={setZoneId} />
        <details className="cam-hints">
          <summary>ما الذي تبحث عنه في «<KeepLatin text={zone.title} />»</summary>
          <ul>{zone.whatToCheck.map((t) => <li key={t}>{t}</li>)}</ul>
        </details>
        <p className="faint cam-safety">{zone.safety[0]}</p>
      </div>

      {cam.status === 'unsupported' && (
        <Callout tone="warn" title="الكاميرا المباشرة غير مدعومة في هذا المتصفح">
          <p>يمكنك التقاط صورة بكاميرا الهاتف الأصلية ورفعها من الزر بالأسفل.</p>
        </Callout>
      )}

      {(cam.status === 'idle' || cam.status === 'error') && (
        <section className="cam-idle" aria-label="تشغيل الكاميرا">
          <div className="viewfinder viewfinder--idle" aria-hidden="true">
            <CornerMarks />
            <span className="vf-scan" />
            <IconCamera className="vf-icon" />
          </div>
          <p className="muted">عند التشغيل سيطلب المتصفح إذن الكاميرا فقط. لن نطلب الميكروفون، ولن يُسجَّل أي فيديو.</p>
          {cam.status === 'error' && cam.error && (
            <Callout tone="danger" role="alert" title="تعذّر تشغيل الكاميرا">
              <p>{CAMERA_ERROR_TEXT[cam.error]}</p>
            </Callout>
          )}
          <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => void cam.start()}>
            تشغيل الكاميرا الخلفية
          </button>
        </section>
      )}

      <div className={`cam-shell${immersive && showStage ? ' is-immersive' : ''}`} hidden={!showStage}>
        <LiveDetection
          videoRef={videoRef}
          cameraLive={live}
          deviceId={cam.deviceId}
          zoom={cam.zoom}
          zoneId={zoneId}
          captureFrame={cam.capture}
          loader={detectorLoader}
          video={
            <>
              <video ref={videoRef} playsInline muted autoPlay aria-label="معاينة الكاميرا" />
              <div className="cam-hud" aria-hidden="true">
                <CornerMarks />
                {live && <span className="live-pill">مباشر</span>}
                {flash > 0 && <span key={flash} className="cam-flash" />}
              </div>
            </>
          }
        />
        {cam.status === 'starting' && <p className="faint cam-starting" role="status">جارٍ تشغيل الكاميرا…</p>}
        {live && (
          <div className="cam-dock" role="group" aria-label="أدوات الكاميرا">
            <div className="cam-dock-row">
              {cam.torchAvailable ? (
                <button type="button" className="cam-tool" aria-pressed={cam.torchOn} onClick={() => void cam.setTorch(!cam.torchOn)}>
                  <IconTorch />
                  <span>{cam.torchOn ? 'إطفاء الكشاف' : 'تشغيل الكشاف'}</span>
                </button>
              ) : (
                <span className="cam-tool is-disabled"><IconTorch /><span>لا يوجد كشاف</span></span>
              )}
              <button type="button" className="shutter" aria-label="التقاط صورة" onClick={() => void onCapture()}>
                <span className="shutter-core" />
              </button>
              <button type="button" className="cam-tool" aria-pressed={immersive} onClick={() => setImmersive((v) => !v)}>
                {immersive ? <IconCollapse /> : <IconExpand />}
                <span>{immersive ? 'تصغير' : 'ملء الشاشة'}</span>
              </button>
            </div>

            {cam.zoomRange && cam.zoom !== undefined ? (
              <div className="field cam-zoom">
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
            {!cam.torchAvailable && <p className="faint">الكشاف غير متاح من المتصفح على هذا الجهاز. استخدم كشافًا يدويًا أو هاتفًا آخر.</p>}

            {cam.devices.length > 1 && (
              <div className="field">
                <label htmlFor="camera-select">الكاميرا</label>
                <select id="camera-select" className="input" value={cam.deviceId ?? ''} onChange={(e) => void cam.start(e.target.value)}>
                  {cam.devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="button" className="btn btn--ghost btn--block" onClick={onStop}>
              <IconStop /> إيقاف
            </button>
          </div>
        )}
      </div>

      <div className="cam-upload">
        <label className="btn btn--ghost btn--block" htmlFor="file-capture">رفع صورة من كاميرا الهاتف</label>
        <input id="file-capture" type="file" accept="image/*" capture="environment" className="visually-hidden" onChange={onFile} />
      </div>

      <Callout title="حدود الفحص بالصور">
        <p>
          الكاميرا ترى السطح الظاهر فقط، ولا ترى خلف ألواح السيارة أو داخلها. الكشف الحي يتعرف على فئات عامة مثل الهاتف والكوب، ولا يتعرف على أجهزة التتبع أو التسجيل،
          ولا يمكن لصورة وحدها إثبات أن جسمًا ما جهاز تتبع أو تسجيل. كثير من القطع الأصلية في السيارات تبدو كعلب سوداء صغيرة.
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
