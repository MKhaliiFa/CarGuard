import { Callout } from '../../components/Callout'
import { useCompassHeading } from './useCompassHeading'

export function MagnetometerUnsupported() {
  const compass = useCompassHeading()
  return (
    <div className="stack">
      <Callout tone="warn" role="status" title="مستشعر المجال المغناطيسي غير متاح في هذا المتصفح">
        <p>
          المتصفح لا يوفّر واجهة قراءة المجال المغناطيسي لهذا الموقع، لذلك لن يعرض التطبيق أي قراءات بالميكروتسلا. لا نحاكي القراءات ولا نخمّنها.
        </p>
        <ul>
          <li>على آيفون: متصفح سفاري وكل متصفحات iOS لا توفّر هذه الواجهة.</li>
          <li>على أندرويد: كروم يوفّرها فقط بعد تفعيل خيار تجريبي في صفحة الإعدادات المتقدمة للمتصفح، وقد لا تعمل حتى بعد تفعيله.</li>
        </ul>
      </Callout>

      <div className="panel">
        <h2>بدائل مدعومة</h2>
        <ol>
          <li>
            <strong>تطبيق أصلي لقياس المجال المغناطيسي:</strong> تطبيقات المستشعرات الأصلية تقرأ المستشعر مباشرة. سجّل خط الأساس والفرق يدويًا كملاحظة في خريطة الفحص.
          </li>
          <li>
            <strong>مؤشر البوصلة غير المباشر بالأسفل:</strong> اتجاه البوصلة مشتق من المستشعر المغناطيسي. إذا أمسكت الهاتف ثابتًا تمامًا وتأرجح الاتجاه فجأة قرب منطقة، فهذا اضطراب مغناطيسي محلي يستحق الفحص البصري فقط.
          </li>
          <li>
            <strong>الفحص البصري</strong> بالكاميرا والكشاف يظل أهم وسيلة متاحة.
          </li>
        </ol>
      </div>

      <div className="panel">
        <div className="panel-title">
          <h2>مؤشر البوصلة (غير مباشر)</h2>
          {compass.status === 'running' || compass.status === 'no_data' ? (
            <button type="button" className="btn btn--ghost" onClick={compass.stop}>إيقاف</button>
          ) : (
            <button type="button" className="btn" onClick={() => void compass.start()} disabled={compass.status === 'unsupported'}>
              تشغيل البوصلة
            </button>
          )}
        </div>
        {compass.status === 'unsupported' && <p className="faint">مستشعر الاتجاه غير متاح في هذا المتصفح.</p>}
        {compass.status === 'denied' && <p role="alert">تم رفض إذن مستشعر الحركة والاتجاه. يمكنك السماح به من إعدادات المتصفح.</p>}
        {compass.status === 'no_data' && <p className="faint">في انتظار قراءة اتجاه حقيقية من الجهاز… بعض الأجهزة لا ترسل اتجاه البوصلة للمتصفح.</p>}
        {compass.status === 'running' && compass.heading !== undefined && (
          <>
            <div className="readout" aria-live="polite">{Math.round(compass.heading)}<small>°</small></div>
            <dl className="kv">
              <dt>مدى التأرجح في آخر ثلاث ثوانٍ</dt>
              <dd>{compass.spread.toFixed(0)}°</dd>
            </dl>
            <p className="faint">هذا المؤشر يتأثر بأي حركة للهاتف. لا يُستخدم كقياس، ولا يسجله التطبيق تلقائيًا.</p>
          </>
        )}
      </div>
    </div>
  )
}
