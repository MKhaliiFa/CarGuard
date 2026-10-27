import type { Classification, ZoneStatus } from './types'

export const STATUS_LABEL: Record<ZoneStatus, string> = {
  not_inspected: 'لم تُفحص',
  inspected: 'تم الفحص',
  needs_followup: 'تحتاج فحصًا إضافيًا',
}

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  confirmed: 'مؤكدة بالمعاينة',
  suspicious: 'مؤشر مشتبه به',
  inconclusive: 'غير حاسمة',
}

export const CLASSIFICATION_HINT: Record<Classification, string> = {
  confirmed: 'رأيت الجسم بعينك وتأكدت أنه ليس جزءًا من السيارة أو من أغراضك.',
  suspicious: 'شيء غير مألوف يستحق نظرة أقرب، وليس دليلًا.',
  inconclusive: 'لا يرجّح وجود شيء ولا ينفيه.',
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}
