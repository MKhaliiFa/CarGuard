import { useEffect, useRef, useState } from 'react'
import { Callout } from '../../components/Callout'
import { ZoneSelect } from '../../components/ZoneSelect'
import { newId } from '../../lib/ids'
import type { ZoneId } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'
import {
  BT_ERROR_TEXT,
  companyLabel,
  getBluetooth,
  mapBtError,
  mergeAdvertisement,
  type BtAdvertisementEvent,
  type BtErrorCode,
  type BtScan,
  type SeenDevice,
} from './bluetooth'

const SCAN_LIMIT_MS = 30_000
const WATCH_LIMIT_MS = 15_000

function DeviceRow({ device, onRecord }: { readonly device: SeenDevice; readonly onRecord: (d: SeenDevice) => void }) {
  const last = device.rssiSamples.at(-1)
  const strongest = device.rssiSamples.length ? Math.max(...device.rssiSamples) : undefined
  return (
    <li>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <strong>{device.name || 'بدون اسم معلن'}</strong>
        <span className="faint">{device.count} إعلان</span>
      </div>
      <dl className="kv" style={{ marginTop: 'var(--space-1)' }}>
        <dt>المعرّف داخل المتصفح</dt>
        <dd style={{ overflowWrap: 'anywhere' }}>{device.id}</dd>
        <dt>آخر قوة إشارة</dt>
        <dd>{last !== undefined ? `${last} dBm` : 'لم يوفّرها المتصفح'}</dd>
        {strongest !== undefined && (
          <>
            <dt>أقوى إشارة رُصدت</dt>
            <dd>{strongest} dBm</dd>
          </>
        )}
        {device.companies.length > 0 && (
          <>
            <dt>الشركة المصنّعة المعلنة</dt>
            <dd>{device.companies.map(companyLabel).join('، ')}</dd>
          </>
        )}
      </dl>
      <button type="button" className="btn btn--ghost" style={{ marginTop: 'var(--space-2)' }} onClick={() => onRecord(device)}>
        تسجيل كملاحظة
      </button>
    </li>
  )
}

export function WebBluetoothPanel() {
  const bt = getBluetooth()
  const { dispatch } = useInspection()
  const [available, setAvailable] = useState<boolean>()
  const [error, setError] = useState<BtErrorCode>()
  const [devices, setDevices] = useState<ReadonlyMap<string, SeenDevice>>(new Map())
  const [scanning, setScanning] = useState(false)
  const [zoneId, setZoneId] = useState<ZoneId>('trunk-spare')
  const [notice, setNotice] = useState<string>()
  const scanRef = useRef<BtScan | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!bt?.getAvailability) return
    bt.getAvailability().then(setAvailable).catch(() => setAvailable(undefined))
  }, [bt])

  useEffect(() => {
    if (!bt) return
    const onAd = (e: Event) => {
      const ev = e as BtAdvertisementEvent
      setDevices((prev) => new Map(prev).set(ev.device.id, mergeAdvertisement(prev.get(ev.device.id), ev, Date.now())))
    }
    bt.addEventListener('advertisementreceived', onAd)
    return () => {
      bt.removeEventListener('advertisementreceived', onAd)
      scanRef.current?.stop()
      window.clearTimeout(timerRef.current)
    }
  }, [bt])

  if (!bt) return null

  const stopScan = () => {
    scanRef.current?.stop()
    scanRef.current = null
    window.clearTimeout(timerRef.current)
    setScanning(false)
  }

  const chooseDevice = async () => {
    setError(undefined)
    try {
      const device = await bt.requestDevice({ acceptAllDevices: true })
      dispatch({ type: 'markBluetoothChecked' })
      setDevices((prev) => new Map(prev).set(device.id, prev.get(device.id) ?? { id: device.id, name: device.name ?? undefined, rssiSamples: [], companies: [], firstSeen: Date.now(), lastSeen: Date.now(), count: 0 }))
      if (device.watchAdvertisements) {
        const ctrl = new AbortController()
        device.addEventListener('advertisementreceived', (e) => {
          const ev = e as BtAdvertisementEvent
          setDevices((prev) => new Map(prev).set(device.id, mergeAdvertisement(prev.get(device.id), ev, Date.now())))
        })
        await device.watchAdvertisements({ signal: ctrl.signal }).catch(() => undefined)
        window.setTimeout(() => ctrl.abort(), WATCH_LIMIT_MS)
      }
    } catch (err) {
      setError(mapBtError(err))
    }
  }

  const startScan = async () => {
    if (!bt.requestLEScan) return
    setError(undefined)
    try {
      scanRef.current = await bt.requestLEScan({ acceptAllAdvertisements: true, keepRepeatedDevices: true })
      dispatch({ type: 'markBluetoothChecked' })
      setScanning(true)
      timerRef.current = window.setTimeout(stopScan, SCAN_LIMIT_MS)
    } catch (err) {
      setError(mapBtError(err))
    }
  }

  const record = (d: SeenDevice) => {
    const strongest = d.rssiSamples.length ? Math.max(...d.rssiSamples) : undefined
    dispatch({
      type: 'addObservation',
      observation: {
        id: newId('obs'),
        zoneId,
        kind: 'bluetooth',
        source: 'bluetooth',
        classification: 'inconclusive',
        text: `جهاز بلوتوث «${d.name || 'بدون اسم'}»${strongest !== undefined ? `، أقوى إشارة ${strongest} dBm` : ''}${d.companies.length ? `، المصنّع المعلن ${d.companies.map(companyLabel).join('، ')}` : ''}. ظهور جهاز غير معروف ليس دليلًا على مراقبة.`,
        createdAt: new Date().toISOString(),
      },
    })
    setNotice('تم تسجيل الجهاز كملاحظة غير حاسمة. يمكنك تغيير تصنيفها من خريطة الفحص.')
  }

  const list = [...devices.values()].sort((a, b) => (Math.max(...b.rssiSamples, -999)) - (Math.max(...a.rssiSamples, -999)))

  return (
    <div className="stack">
      <div className="panel">
        <h2>البلوتوث من المتصفح</h2>
        {available === false && <Callout tone="warn" title="البلوتوث غير متاح">شغّل البلوتوث من إعدادات الهاتف ثم أعد تحميل الصفحة.</Callout>}
        <p className="muted">
          «اختيار جهاز» يفتح نافذة من المتصفح نفسه تعرض الأجهزة القريبة التي تبث حاليًا. التطبيق يعرف فقط الجهاز الذي تختاره أنت، ولا يحصل على قائمة كاملة.
          على أندرويد قد يطلب كروم إذن «الأجهزة القريبة» أو الموقع لأن النظام يربطهما بالبلوتوث، ولا يستخدم التطبيق موقعك.
        </p>
        <button type="button" className="btn btn--primary btn--block" onClick={() => void chooseDevice()}>
          اختيار جهاز قريب
        </button>
        <p className="faint" style={{ marginTop: 'var(--space-2)' }}>
          كثير من أجهزة التتبع تغيّر عنوانها باستمرار أو لا تظهر في هذه النافذة، لذلك عدم ظهور جهاز لا يعني عدم وجوده.
        </p>
      </div>

      {bt.requestLEScan ? (
        <div className="panel">
          <h2>مسح الإعلانات القريبة (تجريبي)</h2>
          <p className="muted">
            هذا المتصفح يوفّر واجهة مسح تجريبية. يعرض المسح الإعلانات التي استقبلها المتصفح فعلًا مع قوة الإشارة لمدة ثلاثين ثانية بحد أقصى. تحرك ببطء بين مناطق السيارة ولاحظ أين تقوى الإشارة.
          </p>
          {scanning ? (
            <button type="button" className="btn btn--block" onClick={stopScan}>إيقاف المسح</button>
          ) : (
            <button type="button" className="btn btn--block" onClick={() => void startScan()}>بدء المسح</button>
          )}
          {scanning && <p role="status" className="faint" style={{ marginTop: 'var(--space-2)' }}>المسح يعمل الآن. الأجهزة تظهر بالأسفل فور وصول إعلانات حقيقية.</p>}
        </div>
      ) : (
        <p className="faint">مسح الإعلانات المستمر غير متاح في هذا المتصفح، لذلك لا نعرض قوة الإشارة إلا إذا وفّرها المتصفح للجهاز المختار.</p>
      )}

      {error && <Callout tone="danger" role="alert" title="تعذّر استخدام البلوتوث"><p>{BT_ERROR_TEXT[error]}</p></Callout>}

      {list.length > 0 && (
        <div className="panel panel--flush">
          <div style={{ padding: 'var(--space-4) var(--space-4) 0' }}>
            <h2>الأجهزة التي استقبلها المتصفح ({list.length})</h2>
            <ZoneSelect value={zoneId} onChange={setZoneId} label="المنطقة التي ستُربط بها الملاحظة" />
            {notice && <p role="status">{notice}</p>}
          </div>
          <ul className="list-reset row-list">
            {list.map((d) => <DeviceRow key={d.id} device={d} onRecord={record} />)}
          </ul>
        </div>
      )}
    </div>
  )
}
