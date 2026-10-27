import { useEffect, useState } from 'react'

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
    <div className="panel">
      <h2>التثبيت على الشاشة الرئيسية</h2>
      {installed && <p role="status" style={{ color: 'var(--c-teal)' }}>تم التثبيت.</p>}
      {promptEvent && (
        <button type="button" className="btn btn--primary btn--block" onClick={() => void install()} style={{ marginBottom: 'var(--space-4)' }}>
          تثبيت التطبيق الآن
        </button>
      )}
      <h3>أندرويد (كروم)</h3>
      <ol>
        <li>افتح الموقع في كروم عبر رابط يبدأ بـ https.</li>
        <li>اضغط زر القائمة ⋮ أعلى الشاشة.</li>
        <li>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</li>
      </ol>
      <h3>آيفون (سفاري)</h3>
      <ol>
        <li>افتح الموقع في سفاري.</li>
        <li>اضغط زر المشاركة أسفل الشاشة.</li>
        <li>اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».</li>
      </ol>
      <p className="faint">بعد أول فتح، تعمل قوائم الفحص والملاحظات بدون إنترنت. الكاميرا والمستشعرات تحتاج الأذونات نفسها داخل التطبيق المثبّت.</p>
    </div>
  )
}
