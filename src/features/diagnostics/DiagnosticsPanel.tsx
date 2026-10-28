import { useMemo } from 'react'
import { IconSettings } from '../../components/icons'
import { detectCapabilities, type Capabilities } from '../../lib/capabilities'

const ROWS: { key: keyof Capabilities; label: string; note: string }[] = [
  { key: 'secureContext', label: 'اتصال آمن HTTPS', note: 'مطلوب للكاميرا والمستشعرات والبلوتوث والتثبيت.' },
  { key: 'camera', label: 'الكاميرا المباشرة', note: 'بديلها: رفع صورة من كاميرا الهاتف.' },
  { key: 'magnetometer', label: 'مستشعر المجال المغناطيسي', note: 'غير متاح في آيفون، وتجريبي في كروم أندرويد.' },
  { key: 'deviceOrientation', label: 'مستشعر الاتجاه والبوصلة', note: 'يُستخدم كمؤشر غير مباشر فقط.' },
  { key: 'webBluetooth', label: 'البلوتوث من المتصفح', note: 'كروم أندرويد فقط. غير مدعوم في آيفون.' },
  { key: 'bluetoothLeScan', label: 'مسح إعلانات البلوتوث', note: 'تجريبي ويحتاج تفعيلًا يدويًا في كروم.' },
  { key: 'indexedDb', label: 'التخزين المحلي', note: 'لحفظ الملاحظات والصور على الجهاز.' },
  { key: 'serviceWorker', label: 'العمل بدون إنترنت', note: 'لتشغيل قوائم الفحص بدون اتصال.' },
  { key: 'standalone', label: 'يعمل كتطبيق مثبّت', note: 'يظهر «لا» داخل المتصفح العادي.' },
]

const PLATFORM_LABEL = { ios: 'آيفون / آيباد', android: 'أندرويد', desktop: 'كمبيوتر', unknown: 'غير معروف' } as const

export function DiagnosticsPanel() {
  const caps = useMemo(() => detectCapabilities(), [])
  const available = ROWS.filter((r) => caps[r.key] === true).length
  return (
    <section className="panel panel--flush" aria-labelledby="caps-title">
      <div className="panel-pad">
        <div className="panel-head">
          <span className="panel-icon"><IconSettings /></span>
          <div className="panel-head-text">
            <h2 id="caps-title">توافق هذا الجهاز</h2>
          </div>
          <span className="chip"><span className="mono">{available}/{ROWS.length}</span></span>
        </div>
        <p className="faint">النظام المكتشف: {PLATFORM_LABEL[caps.platform]}. النتائج تعكس ما يتيحه هذا المتصفح فعلًا الآن.</p>
      </div>
      <ul className="list-reset row-list">
        {ROWS.map((r) => {
          const ok = caps[r.key] === true
          // Neutral, not green: green is reserved for completed inspection steps.
          return (
            <li key={r.key} className="cap-row">
              <span>
                <span className="cap-name">{r.label}</span>
                <span className="cap-note">{r.note}</span>
              </span>
              <span className={`chip ${ok ? '' : 'chip--unavailable'}`}>{ok ? 'متاح' : 'غير متاح'}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
