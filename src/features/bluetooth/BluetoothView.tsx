import { Callout } from '../../components/Callout'
import { PageHead } from '../../components/PageHead'
import { detectPlatform } from '../../lib/capabilities'
import { getBluetooth } from './bluetooth'
import { OsTrackerChecks } from './OsTrackerChecks'
import { WebBluetoothPanel } from './WebBluetoothPanel'

export function BluetoothView() {
  const supported = getBluetooth() !== undefined
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints ?? 0)

  return (
    <>
      <PageHead eyebrow="BLUETOOTH" title="البلوتوث وتنبيهات النظام">
        <p>أقوى أداة متاحة لاكتشاف أجهزة التتبع بالبلوتوث هي تنبيهات نظام التشغيل نفسه. ابدأ بها، ثم استخدم البلوتوث من المتصفح إن كان مدعومًا.</p>
      </PageHead>
      <div className="stack">
        <OsTrackerChecks />
        {supported ? (
          <WebBluetoothPanel />
        ) : (
          <Callout tone="warn" role="status" title="البلوتوث من المتصفح غير مدعوم هنا">
            <p>
              {platform === 'ios'
                ? 'سفاري وكل المتصفحات على آيفون لا تدعم واجهة البلوتوث للمواقع. اعتمد على تنبيهات التتبع في النظام بالأعلى.'
                : 'هذا المتصفح لا يدعم واجهة البلوتوث للمواقع. على أندرويد استخدم كروم المحدّث عبر اتصال آمن.'}
            </p>
            <p>لن يعرض التطبيق أي قائمة أجهزة أو قوة إشارة لم يوفّرها المتصفح فعلًا.</p>
          </Callout>
        )}
        <Callout title="تذكير مهم">
          <p>وجود جهاز بلوتوث غير مألوف قريب من السيارة ليس دليلًا على مراقبة. السماعات والساعات وهواتف المارة والسيارات المجاورة تبث إشارات بلوتوث باستمرار.</p>
        </Callout>
      </div>
    </>
  )
}
