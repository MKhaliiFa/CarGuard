import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.error('Service worker registration failed', error)
    },
  })

  if (!offlineReady && !needRefresh) return null
  return (
    <div role="status" className="panel" style={{ position: 'fixed', insetInline: 16, bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 12px)', zIndex: 40, maxWidth: 520, marginInline: 'auto' }}>
      <p style={{ marginBottom: 'var(--space-2)' }}>{needRefresh ? 'يتوفر إصدار أحدث من التطبيق.' : 'التطبيق جاهز للعمل بدون إنترنت.'}</p>
      <div className="btn-row">
        {needRefresh && (
          <button type="button" className="btn btn--primary" onClick={() => void updateServiceWorker(true)}>تحديث</button>
        )}
        <button type="button" className="btn btn--ghost" onClick={() => { setOfflineReady(false); setNeedRefresh(false) }}>إغلاق</button>
      </div>
    </div>
  )
}
