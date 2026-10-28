import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { IconLock, IconTrash } from '../../components/icons'
import { deleteAllData } from '../../lib/storage'
import { useInspection } from '../../state/InspectionContext'

export function PrivacyPanel() {
  const { dispatch } = useInspection()
  const [confirming, setConfirming] = useState(false)
  const [status, setStatus] = useState<string>()

  const wipe = async () => {
    setConfirming(false)
    try {
      await deleteAllData()
      dispatch({ type: 'reset' })
      setStatus('تم حذف كل البيانات من هذا الجهاز.')
    } catch (err) {
      console.error('Delete all failed', err)
      setStatus('تعذّر حذف بعض البيانات. يمكنك حذف بيانات الموقع من إعدادات المتصفح.')
    }
  }

  return (
    <section className="panel" aria-labelledby="privacy-title">
      <div className="panel-head">
        <span className="panel-icon"><IconLock /></span>
        <div className="panel-head-text">
          <h2 id="privacy-title">الخصوصية والبيانات</h2>
        </div>
      </div>
      <ul className="fact-list">
        <li>كل الملاحظات والصور تُحفظ على هذا الجهاز فقط. لا يوجد خادم ولا حساب ولا تحليلات.</li>
        <li>لا يطلب التطبيق الميكروفون أو جهات الاتصال أو الموقع الدقيق، ولا يسجل أي صوت.</li>
        <li>الصور لا تُحفظ إلا بعد موافقتك، والتقارير لا تُنشأ إلا بطلبك.</li>
        <li>عند تثبيت التطبيق تُخزَّن ملفاته فقط للعمل بدون إنترنت.</li>
      </ul>
      <div className="danger-zone">
        <button type="button" className="btn btn--danger btn--block" onClick={() => setConfirming(true)}>
          <IconTrash /> حذف كل البيانات
        </button>
        <p>يحذف الملاحظات والصور والنتائج من هذا الجهاز بعد التأكيد.</p>
      </div>
      {status && <p role="status" className="panel-sub">{status}</p>}
      <ConfirmDialog
        open={confirming}
        tone="danger"
        title="حذف كل البيانات؟"
        confirmLabel="حذف نهائي"
        onConfirm={() => void wipe()}
        onCancel={() => setConfirming(false)}
      >
        <p>سيتم حذف كل الملاحظات والصور وخط الأساس والنتائج من هذا الجهاز. لا يمكن التراجع. صدّر تقريرًا أولًا إن احتجته.</p>
      </ConfirmDialog>
    </section>
  )
}
