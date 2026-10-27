import { CLASSIFICATION_LABEL, STATUS_LABEL, formatDateTime } from './labels'
import { TIER_LABEL, prioritizeZones } from './prioritize'
import { ZONES } from './zones'
import type { InspectionState, Observation } from './types'

/** One-line description of detector output and manual-review answers attached to an observation. */
export function describeExtras(o: Observation): string {
  const parts: string[] = []
  if (o.detection) {
    const d = o.detection
    parts.push(`تصنيف النموذج: ${d.labelAr} (${d.label}) بثقة ${Math.round(d.score * 100)}%، الإطار ${d.widthPx}×${d.heightPx} بكسل`)
    if (d.estimate) parts.push(`أبعاد تقريبية ${d.estimate.widthCm.toFixed(1)}±${d.estimate.widthErrCm.toFixed(1)} × ${d.estimate.heightCm.toFixed(1)}±${d.estimate.heightErrCm.toFixed(1)} سم بمرجع «${d.estimate.reference}»`)
  }
  if (o.review?.checks.length) parts.push(`علامات لاحظتها: ${o.review.checks.join('، ')}`)
  return parts.join(' · ')
}

export const REPORT_DISCLAIMER =
  'هذا التقرير توثيق لفحص يدوي أجراه المستخدم. لا يثبت التطبيق وجود أجهزة تتبع أو تسجيل ولا ينفيه، ولا يحدد مكان أي جهاز. ' +
  'الملاحظات «المؤكدة» هي ما أكده المستخدم بالمعاينة، وقراءات المستشعرات والبلوتوث مؤشرات فقط.'

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

const OS_RESULT: Record<string, string> = { no_alert: 'لم يظهر تنبيه', alert_shown: 'ظهر تنبيه', not_available: 'غير متاحة' }

/** photoDataUrls: only provided when the user explicitly chose to include photos. */
export function buildHtmlReport(state: InspectionState, photoDataUrls: ReadonlyMap<string, string> = new Map(), now = new Date()): string {
  const { ranked, notInspected } = prioritizeZones(state)
  const e = escapeHtml

  const priorities = ranked.length
    ? `<ol>${ranked.map((z) => `<li><b>${e(z.title)}</b> — ${e(TIER_LABEL[z.tier])}<ul>${z.reasons.map((r) => `<li>${e(r)}</li>`).join('')}</ul></li>`).join('')}</ol>`
    : '<p>لا توجد ملاحظات مسجلة.</p>'

  const zones = ZONES.map((z) => {
    const rec = state.zones[z.id]
    const obs = state.observations.filter((o) => o.zoneId === z.id)
    const photos = rec.photoIds
      .map((id) => photoDataUrls.get(id))
      .filter((u): u is string => !!u && u.startsWith('data:image/'))
      .map((u) => `<img src="${e(u)}" alt="">`)
      .join('')
    return `<section><h3>${e(z.title)}</h3>
<p>الحالة: <b>${e(STATUS_LABEL[rec.status])}</b> · وقت الفحص: ${e(formatDateTime(rec.inspectedAt))}</p>
${rec.notes ? `<p class="notes">${e(rec.notes)}</p>` : ''}
${obs.length ? `<ul>${obs.map((o) => `<li><span class="tag ${o.classification}">${e(CLASSIFICATION_LABEL[o.classification])}</span> ${e(o.text || 'بدون وصف')}${describeExtras(o) ? `<br><small>${e(describeExtras(o))}</small>` : ''} <small>(${e(formatDateTime(o.createdAt))})</small></li>`).join('')}</ul>` : ''}
${rec.photoIds.length ? (photos ? `<div class="photos">${photos}</div>` : `<p><small>${rec.photoIds.length} صورة محفوظة على الجهاز ولم تُضمَّن في التقرير.</small></p>`) : ''}
</section>`
  }).join('\n')

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>تقرير فحص السيارة — CarGuard</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif;max-width:800px;margin:24px auto;padding:0 16px;line-height:1.7;color:#111;background:#fff}
h1{margin-bottom:4px}.disclaimer{border-inline-start:4px solid #c88a12;background:#fff7e6;padding:12px}
section{border-top:1px solid #ddd;padding:8px 0}.notes{white-space:pre-wrap;background:#f6f6f6;padding:8px}
.tag{font-size:.8em;padding:1px 8px;border-radius:99px;background:#eee}.tag.confirmed{background:#ffd9d4}.tag.suspicious{background:#ffeec7}
.photos{display:flex;flex-wrap:wrap;gap:8px}.photos img{width:180px;height:180px;object-fit:cover;border-radius:6px}
</style></head><body>
<h1>تقرير فحص السيارة</h1>
<p>تاريخ التقرير: ${e(formatDateTime(now.toISOString()))}</p>
<p class="disclaimer">${e(REPORT_DISCLAIMER)}</p>
<h2>الأماكن المقترحة لفحص أدق</h2>
${priorities}
${notInspected.length ? `<p>مناطق لم تُفحص: ${e(notInspected.map((id) => ZONES.find((z) => z.id === id)!.title).join('، '))}</p>` : ''}
<h2>تنبيهات أنظمة التشغيل</h2>
<ul><li>أندرويد: ${e(state.osChecks.android.result ? OS_RESULT[state.osChecks.android.result]! : 'لم يُسجَّل')}</li>
<li>آيفون: ${e(state.osChecks.ios.result ? OS_RESULT[state.osChecks.ios.result]! : 'لم يُسجَّل')}</li></ul>
${state.magneticBaseline ? `<p>خط الأساس المغناطيسي: ${state.magneticBaseline.meanMicroTesla.toFixed(1)} µT (σ ${state.magneticBaseline.noiseMicroTesla.toFixed(2)})</p>` : ''}
<h2>تفاصيل المناطق</h2>
${zones}
</body></html>`
}

export function buildJsonExport(state: InspectionState, now = new Date()): string {
  return JSON.stringify({ app: 'CarGuard', exportedAt: now.toISOString(), disclaimer: REPORT_DISCLAIMER, state }, null, 2)
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

export function downloadText(filename: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
