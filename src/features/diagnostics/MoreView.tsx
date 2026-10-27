import { Callout } from '../../components/Callout'
import { PageHead } from '../../components/PageHead'
import { InstallGuide } from '../install/InstallGuide'
import { PrivacyPanel } from '../privacy/PrivacyPanel'
import { DiagnosticsPanel } from './DiagnosticsPanel'

export function MoreView() {
  return (
    <>
      <PageHead eyebrow="SETTINGS" title="الإعدادات والتوافق" />
      <div className="stack">
        <DiagnosticsPanel />
        <InstallGuide />
        <PrivacyPanel />
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
