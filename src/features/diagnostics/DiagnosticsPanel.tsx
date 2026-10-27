import { useMemo } from 'react'
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
  return (
    <div className="panel panel--flush">
      <div style={{ padding: 'var(--space-4) var(--space-4) 0' }}>
        <h2>توافق هذا الجهاز</h2>
        <p className="faint">النظام المكتشف: {PLATFORM_LABEL[caps.platform]}. النتائج تعكس ما يتيحه هذا المتصفح فعلًا الآن.</p>
      </div>
      <ul className="list-reset row-list">
        {ROWS.map((r) => {
          const ok = caps[r.key] === true
          return (
            <li key={r.key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-2)', alignItems: 'center' }}>
              <span>
                <span style={{ display: 'block', fontWeight: 600 }}>{r.label}</span>
                <span className="faint">{r.note}</span>
              </span>
              <span className={`chip ${ok ? 'chip--inspected' : 'chip--not_inspected'}`}>{ok ? 'متاح' : 'غير متاح'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
