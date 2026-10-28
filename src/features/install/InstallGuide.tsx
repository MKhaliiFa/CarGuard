import { useEffect, useState } from 'react'
import { IconDownload, IconPhone } from '../../components/icons'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallGuide() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent>()
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!promptEvent) return
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setPromptEvent(undefined)
  }

  return (
    <section className="panel" aria-labelledby="install-title">
      <div className="panel-head">
        <span className="panel-icon"><IconDownload /></span>
        <div className="panel-head-text">
          <h2 id="install-title">التثبيت على الشاشة الرئيسية</h2>
        </div>
        {installed && <span className="chip">مثبّت</span>}
      </div>
      {installed && <p role="status" className="muted">تم التثبيت.</p>}
      {promptEvent && (
        <button type="button" className="btn btn--primary btn--block install-now" onClick={() => void install()}>
          تثبيت التطبيق الآن
        </button>
      )}
      <div className="platform-grid">
        <div className="platform">
          <h3><IconPhone /> أندرويد (كروم)</h3>
          <ol className="steps-list">
            <li>افتح الموقع في كروم عبر رابط يبدأ بـ https.</li>
            <li>اضغط زر القائمة ⋮ أعلى الشاشة.</li>
            <li>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</li>
          </ol>
        </div>
        <div className="platform">
          <h3><IconPhone /> آيفون (سفاري)</h3>
          <ol className="steps-list">
            <li>افتح الموقع في سفاري.</li>
            <li>اضغط زر المشاركة أسفل الشاشة.</li>
            <li>اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».</li>
          </ol>
        </div>
      </div>
      <p className="faint panel-sub">بعد أول فتح، تعمل قوائم الفحص والملاحظات بدون إنترنت. الكاميرا والمستشعرات تحتاج الأذونات نفسها داخل التطبيق المثبّت.</p>
    </section>
  )
}
