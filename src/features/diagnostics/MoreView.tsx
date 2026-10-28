import { Callout } from '../../components/Callout'
import { IconInfo } from '../../components/icons'
import { PageHead } from '../../components/PageHead'
import { setIntroSeen } from '../../lib/prefs'
import { InstallGuide } from '../install/InstallGuide'
import { PrivacyPanel } from '../privacy/PrivacyPanel'
import { DiagnosticsPanel } from './DiagnosticsPanel'

/** App listens for this to reopen the intro without a reload. */
export const SHOW_INTRO_EVENT = 'carguard:show-intro'

export function MoreView() {
  return (
    <>
      <PageHead eyebrow="SETTINGS" title="الإعدادات والتوافق" />
      <div className="stack">
        <DiagnosticsPanel />
        <InstallGuide />
        <PrivacyPanel />
        <section className="panel" aria-labelledby="intro-replay-title">
          <div className="panel-head">
            <span className="panel-icon panel-icon--neutral"><IconInfo /></span>
            <div className="panel-head-text">
              <h2 id="intro-replay-title">المقدمة التعريفية</h2>
              <p className="faint">اعرض المقدمة القصيرة التي تشرح ما يفعله التطبيق وحدوده.</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => {
              setIntroSeen(false)
              window.dispatchEvent(new Event(SHOW_INTRO_EVENT))
            }}
          >
            عرض المقدمة مرة أخرى
          </button>
        </section>
        <Callout title="عن التطبيق">
          <p>
            يساعدك هذا التطبيق على فحص سيارتك بشكل منظم. لا يوجد تطبيق ويب ولا مستشعر هاتف يمكنه كشف كل أجهزة التتبع أو التسجيل بشكل موثوق.
            الأجهزة التي تعمل بشريحة اتصال، أو تبقى صامتة، أو مخفية خلف ألواح، قد لا تُكتشف إلا بفحص مختص.
          </p>
        </Callout>
      </div>
    </>
  )
}
