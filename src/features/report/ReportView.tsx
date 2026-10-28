import { useState } from 'react'
import { Callout } from '../../components/Callout'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { IconDownload, IconReport } from '../../components/icons'
import { PageHead } from '../../components/PageHead'
import { useToast } from '../../components/Toast'
import { blobToDataUrl, buildHtmlReport, buildJsonExport, downloadText } from '../../lib/report'
import { loadPhoto } from '../../lib/storage'
import { ZONES } from '../../lib/zones'
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
  const zonesChecked = ZONES.filter((z) => state.zones[z.id].status !== 'not_inspected').length

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
      <div className="stat-strip" role="group" aria-label="ملخص ما سجلته">
        <div className="stat">
          <span className="stat-value">{zonesChecked}<small>/{ZONES.length}</small></span>
          <span className="stat-label">مناطق سجّلت حالتها</span>
          <span className="bar" aria-hidden="true"><span style={{ ['--p' as string]: zonesChecked / ZONES.length }} /></span>
        </div>
        <div className="stat">
          <span className="stat-value">{state.observations.length}</span>
          <span className="stat-label">ملاحظات</span>
        </div>
        <div className="stat">
          <span className="stat-value">{photoCount}</span>
          <span className="stat-label">صور محفوظة</span>
        </div>
      </div>
      <div className="stack">
        <div className="panel">
          <h2>الأماكن المقترحة لفحص أدق</h2>
          <PriorityList />
        </div>
        <section className="panel" aria-labelledby="export-title">
          <div className="panel-head">
            <span className="panel-icon"><IconDownload /></span>
            <div className="panel-head-text">
              <h2 id="export-title">تصدير</h2>
              <p className="faint">يُنشأ الملف على جهازك فقط، ولا يُرسل لأي مكان.</p>
            </div>
          </div>
          <div className="option-list">
            <div className="option option--primary">
              <p>ملف HTML يُفتح في أي متصفح ويمكن طباعته، مع خيار تضمين الصور.</p>
              <button type="button" className="btn btn--primary btn--block" onClick={() => setPending('html')}>
                <IconReport /> تقرير قابل للقراءة
              </button>
            </div>
            <div className="option">
              <p>نسخة احتياطية من بياناتك بصيغة JSON، بدون الصور.</p>
              <button type="button" className="btn btn--block" onClick={() => setPending('json')}>
                <IconDownload /> نسخة بيانات JSON
              </button>
            </div>
          </div>
          {status && <p role="status" className="panel-sub">{status}</p>}
        </section>
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
