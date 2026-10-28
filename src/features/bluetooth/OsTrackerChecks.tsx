import type { ReactNode } from 'react'
import { Callout } from '../../components/Callout'
import { IconPhone } from '../../components/icons'
import { formatDateTime } from '../../lib/labels'
import type { OsCheckResult } from '../../lib/types'
import { useInspection } from '../../state/InspectionContext'

const RESULT_LABEL: Record<OsCheckResult, string> = {
  no_alert: 'لم يظهر تنبيه',
  alert_shown: 'ظهر تنبيه بجهاز تتبع',
  not_available: 'الميزة غير متاحة على جهازي',
}

/** Chip for what the user recorded. Green only means the check was done and nothing was shown. */
const RESULT_CHIP: Record<OsCheckResult | 'none', { cls: string; label: string }> = {
  none: { cls: 'chip--todo', label: 'لم تُسجَّل' },
  no_alert: { cls: 'chip--done', label: 'سُجّلت النتيجة' },
  alert_shown: { cls: 'chip--needs_followup', label: 'تحتاج متابعة' },
  not_available: { cls: 'chip--unavailable', label: 'غير متاحة' },
}

function PlatformPanel({ platform, title, intro, children }: { readonly platform: 'android' | 'ios'; readonly title: string; readonly intro: ReactNode; readonly children: ReactNode }) {
  const { state } = useInspection()
  const chip = RESULT_CHIP[state.osChecks[platform].result ?? 'none']
  return (
    <section className="panel" aria-labelledby={`os-${platform}`}>
      <div className="panel-head">
        <span className="panel-icon"><IconPhone /></span>
        <div className="panel-head-text">
          <h2 id={`os-${platform}`}>{title}</h2>
          <span className={`chip ${chip.cls} panel-head-chip`}>{chip.label}</span>
        </div>
      </div>
      <p className="muted">{intro}</p>
      {children}
      <ResultButtons platform={platform} />
    </section>
  )
}

function ResultButtons({ platform }: { readonly platform: 'android' | 'ios' }) {
  const { state, dispatch } = useInspection()
  const current = state.osChecks[platform]
  return (
    <div>
      <p className="panel-sub">سجّل النتيجة: {current.result ? `${RESULT_LABEL[current.result]} · ${formatDateTime(current.at)}` : 'لم تُسجَّل بعد'}</p>
      <div className="choice-grid">
        {(Object.keys(RESULT_LABEL) as OsCheckResult[]).map((r) => (
          <button
            key={r}
            type="button"
            className={`btn ${current.result === r ? 'btn--primary' : ''}`}
            aria-pressed={current.result === r}
            onClick={() => dispatch({ type: 'setOsCheck', platform, result: r, at: new Date().toISOString() })}
          >
            {RESULT_LABEL[r]}
          </button>
        ))}
      </div>
      {current.result === 'alert_shown' && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Callout tone="danger" title="ظهر تنبيه من النظام">
            <p>
              تنبيه النظام يعني أن جهاز تتبع غير مرتبط بك يتحرك معك. اتبع خيارات التنبيه نفسه مثل تشغيل صوت الجهاز لتحديد مكانه، ووثّق التنبيه بلقطة شاشة.
              إن شعرت بخطر على سلامتك، تواصل مع الشرطة قبل نزع أي جهاز.
            </p>
          </Callout>
        </div>
      )}
    </div>
  )
}

export function OsTrackerChecks() {
  return (
    <div className="stack">
      <PlatformPanel
        platform="android"
        title="أندرويد: تنبيهات أجهزة التتبع غير المعروفة"
        intro="ميزة من خدمات جوجل في أندرويد ٦ وأحدث. تعمل تلقائيًا، وتتيح أيضًا فحصًا يدويًا فوريًا."
      >
        <ol className="steps-list">
          <li>افتح الإعدادات، ثم «الأمان والطوارئ».</li>
          <li>اختر «تنبيهات أجهزة التتبع غير المعروفة» واضغط «الفحص الآن».</li>
          <li>على هواتف أوبو قد يختلف المسار حسب إصدار النظام. استخدم البحث داخل الإعدادات واكتب «تتبع» أو «Unknown tracker».</li>
          <li>ابقَ داخل السيارة أو بجانبها أثناء الفحص اليدوي الذي يستغرق ثوانٍ.</li>
        </ol>
        <p className="faint">الفحص اليدوي يجد أجهزة التتبع المدعومة المنفصلة عن مالكها فقط، ولا يجد أجهزة التتبع بشريحة اتصال ولا أجهزة التسجيل الصوتي.</p>
      </PlatformPanel>

      <PlatformPanel
        platform="ios"
        title="آيفون: تنبيهات التتبع غير المرغوب"
        intro={
          <>
            يرسل آيفون تنبيهًا تلقائيًا إذا تحرك معك جهاز إيرتاج أو جهاز من شبكة «تحديد الموقع» غير مرتبط بك. منذ iOS 17.5 تشمل التنبيهات أجهزة تتبع متوافقة من شركات أخرى.
            لا يوجد زر فحص يدوي فوري في آيفون، وقد يستغرق التنبيه وقتًا أثناء التنقل.
          </>
        }
      >
        <ol className="steps-list">
          <li>حدّث النظام لآخر إصدار متاح.</li>
          <li>شغّل البلوتوث، وشغّل خدمات الموقع من «الخصوصية والأمن».</li>
          <li>افتح تطبيق «تحديد الموقع»، ثم «أنا»، وتأكد من تفعيل إشعارات التتبع.</li>
          <li>إذا وجدت جهاز تتبع، استخدم «تحديد عنصر تم العثور عليه» في تطبيق «تحديد الموقع» لقراءة معلوماته بتقريبه من الهاتف.</li>
        </ol>
      </PlatformPanel>

      <Callout title="حدود هذه التنبيهات">
        <p>
          هذه الأنظمة مصممة لأجهزة التتبع بالبلوتوث المرتبطة بشبكات البحث. أجهزة التتبع التي تعمل بشريحة اتصال وتأخذ طاقتها من السيارة، وأجهزة التسجيل الصوتي، لن تظهر فيها غالبًا.
        </p>
      </Callout>
    </div>
  )
}
