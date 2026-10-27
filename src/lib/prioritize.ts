import { ZONES } from './zones'
import type { InspectionState, Observation, ZoneId } from './types'

/** Ordered from most to least urgent. Based only on what the user recorded. */
export type PriorityTier = 'confirmed' | 'suspicious' | 'followup' | 'inconclusive'

export interface ZonePriority {
  readonly zoneId: ZoneId
  readonly title: string
  readonly tier: PriorityTier
  readonly reasons: readonly string[]
  readonly counts: Readonly<Record<Observation['classification'], number>>
}

export interface PrioritizedResult {
  readonly ranked: readonly ZonePriority[]
  readonly notInspected: readonly ZoneId[]
  readonly clearedZones: readonly ZoneId[]
}

const TIER_ORDER: Record<PriorityTier, number> = { confirmed: 0, suspicious: 1, followup: 2, inconclusive: 3 }

function formatDelta(o: Observation): string {
  if (!o.magnetic) return ''
  return ` (فرق ${o.magnetic.deltaMicroTesla.toFixed(1)} ميكروتسلا عن خط الأساس)`
}

function reasonFor(o: Observation): string {
  const prefix: Record<Observation['classification'], string> = {
    confirmed: 'ملاحظة أكدتها بنفسك',
    suspicious: 'مؤشر مشتبه به',
    inconclusive: 'قراءة غير حاسمة',
  }
  const text = o.text.trim() || 'بدون وصف'
  return `${prefix[o.classification]}: ${text}${formatDelta(o)}`
}

export function prioritizeZones(state: InspectionState): PrioritizedResult {
  const ranked: ZonePriority[] = []
  const notInspected: ZoneId[] = []
  const clearedZones: ZoneId[] = []

  for (const zone of ZONES) {
    const record = state.zones[zone.id]
    const obs = state.observations.filter((o) => o.zoneId === zone.id)
    const counts = {
      confirmed: obs.filter((o) => o.classification === 'confirmed').length,
      suspicious: obs.filter((o) => o.classification === 'suspicious').length,
      inconclusive: obs.filter((o) => o.classification === 'inconclusive').length,
    }
    const reasons = [...obs]
      .sort((a, b) => TIER_ORDER[a.classification] - TIER_ORDER[b.classification])
      .map(reasonFor)
    if (record.status === 'needs_followup') reasons.push('وضعت علامة "يحتاج فحصًا إضافيًا" على هذه المنطقة')

    let tier: PriorityTier | undefined
    if (counts.confirmed > 0) tier = 'confirmed'
    else if (counts.suspicious > 0) tier = 'suspicious'
    else if (record.status === 'needs_followup') tier = 'followup'
    else if (counts.inconclusive > 0) tier = 'inconclusive'

    if (tier) {
      ranked.push({ zoneId: zone.id, title: zone.title, tier, reasons, counts })
    } else if (record.status === 'not_inspected') {
      notInspected.push(zone.id)
    } else {
      clearedZones.push(zone.id)
    }
  }

  ranked.sort(
    (a, b) =>
      TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
      b.counts.confirmed - a.counts.confirmed ||
      b.counts.suspicious - a.counts.suspicious ||
      b.counts.inconclusive - a.counts.inconclusive,
  )
  return { ranked, notInspected, clearedZones }
}

export const TIER_LABEL: Record<PriorityTier, string> = {
  confirmed: 'ملاحظة مؤكدة منك',
  suspicious: 'مؤشرات مشتبه بها',
  followup: 'يحتاج فحصًا إضافيًا',
  inconclusive: 'بيانات غير حاسمة',
}
