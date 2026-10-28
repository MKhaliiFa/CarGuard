import { useState } from 'react'
import { Callout } from '../../components/Callout'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { PageHead } from '../../components/PageHead'
import { useToast } from '../../components/Toast'
import { blobToDataUrl, buildHtmlReport, buildJsonExport, downloadText } from '../../lib/report'
import { loadPhoto } from '../../lib/storage'
import { useInspection } from '../../state/InspectionContext'
import { PriorityList } from '../workflow/PriorityList'

type ExportKind = 'html' | 'json'

function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
}

export function ReportView() {
  const { state, dispatch } = useInspection()
  const toast = useToast()
  const [pending, setPending] = useState<ExportKind>()
  const [includePhotos, setIncludePhotos] = useState(false)
  const [status, setStatus] = useState<string>()
  const photoCount = Object.values(state.zones).reduce((n, z) => n + z.photoIds.length, 0)

  const runExport = async () => {
    const kind = pending
    setPending(undefined)
    try {
      if (kind === 'json') {
        downloadText(`carguard-data-${stamp()}.json`, buildJsonExport(state), 'application/json')
      } else {
        const urls = new Map<string, string>()
        if (includePhotos) {
          for (const z of Object.values(state.zones)) {
            for (const id of z.photoIds) {
              const p = await loadPhoto(id)
              if (p) urls.set(id, await blobToDataUrl(p.blob))
            }
          }
        }
        downloadText(`carguard-report-${stamp()}.html`, buildHtmlReport(state, urls), 'text/html')
      }
      setStatus('تم إنشاء الملف على جهازك. لم يُرسل لأي مكان.')
      toast('تم إنشاء الملف على جهازك')
      dispatch({ type: 'setStepMark', step: 'report', mark: 'done' })
    } catch (err) {
      console.error('Export failed', err)
      setStatus('تعذّر إنشاء الملف.')
      toast('تعذّر إنشاء الملف', 'danger')
    }
  }

  return (
    <>
      <PageHead eyebrow="REPORT" title="التقرير والتصدير">
        <p>ملخص ما سجلته، مرتب حسب ملاحظاتك. التصدير يُنشئ ملفًا على جهازك فقط.</p>
      </PageHead>
      <div className="stack">
        <div className="panel">
          <h2>الأماكن المقترحة لفحص أدق</h2>
          <PriorityList />
        </div>
        <div className="panel">
          <h2>تصدير</h2>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={() => setPending('html')}>تقرير قابل للقراءة</button>
            <button type="button" className="btn" onClick={() => setPending('json')}>نسخة بيانات JSON</button>
          </div>
          {status && <p role="status" style={{ marginTop: 'var(--space-3)' }}>{status}</p>}
        </div>
        <Callout title="ما الذي يتضمنه التقرير">
          <p>حالة كل منطقة، والملاحظات وتصنيفها، ونتائج تنبيهات النظام، وقياسات المستشعر إن وجدت، مع تنبيه واضح بأن التقرير لا يثبت وجود جهاز.</p>
        </Callout>
      </div>

      <ConfirmDialog
        open={pending !== undefined}
        title="تأكيد التصدير"
        confirmLabel="إنشاء الملف"
        onConfirm={() => void runExport()}
        onCancel={() => setPending(undefined)}
      >
        <p>سيُنشأ ملف على جهازك يحتوي على ملاحظاتك. أي شخص يصل لهذا الملف سيقرأ محتواه، فاحفظه في مكان آمن.</p>
        {pending === 'html' && photoCount > 0 && (
          <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input type="checkbox" checked={includePhotos} onChange={(e) => setIncludePhotos(e.target.checked)} />
            تضمين الصور المحفوظة ({photoCount}) داخل التقرير
          </label>
        )}
        {pending === 'json' && <p>نسخة البيانات لا تتضمن الصور.</p>}
      </ConfirmDialog>
    </>
  )
}
