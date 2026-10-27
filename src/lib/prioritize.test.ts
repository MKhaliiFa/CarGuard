import { describe, expect, it } from 'vitest'
import { createInitialState, inspectionReducer } from '../state/inspectionReducer'
import type { Observation } from './types'
import { prioritizeZones } from './prioritize'

const add = (s: ReturnType<typeof createInitialState>, o: Partial<Observation>) =>
  inspectionReducer(s, {
    type: 'addObservation',
    observation: { id: Math.random().toString(), zoneId: 'obd', kind: 'note', source: 'user', classification: 'inconclusive', text: 't', createdAt: 'T', ...o },
  })

describe('prioritizeZones', () => {
  it('produces no priorities when nothing has been recorded', () => {
    const r = prioritizeZones(createInitialState())
    expect(r.ranked).toEqual([])
    expect(r.notInspected).toHaveLength(11)
  })

  it('ranks user-confirmed above suspicious above follow-up above inconclusive', () => {
    let s = createInitialState()
    s = add(s, { zoneId: 'exterior', classification: 'inconclusive' })
    s = add(s, { zoneId: 'trunk-spare', classification: 'suspicious' })
    s = add(s, { zoneId: 'obd', classification: 'confirmed' })
    s = inspectionReducer(s, { type: 'setZoneStatus', zoneId: 'front-seats', status: 'needs_followup', at: 'T' })
    const r = prioritizeZones(s)
    expect(r.ranked.map((z) => [z.zoneId, z.tier])).toEqual([
      ['obd', 'confirmed'],
      ['trunk-spare', 'suspicious'],
      ['front-seats', 'followup'],
      ['exterior', 'inconclusive'],
    ])
  })

  it('orders zones in the same tier by number of recorded indicators', () => {
    let s = createInitialState()
    s = add(s, { zoneId: 'exterior', classification: 'suspicious' })
    s = add(s, { zoneId: 'trunk-spare', classification: 'suspicious' })
    s = add(s, { zoneId: 'trunk-spare', classification: 'suspicious' })
    expect(prioritizeZones(s).ranked[0]!.zoneId).toBe('trunk-spare')
  })

  it('gives reasons drawn from recorded observations only, with no probabilities', () => {
    let s = createInitialState()
    s = add(s, { zoneId: 'obd', classification: 'suspicious', text: 'قطعة غريبة في المنفذ' })
    const z = prioritizeZones(s).ranked[0]!
    expect(z.reasons.join(' ')).toContain('قطعة غريبة في المنفذ')
    expect(z.reasons.join(' ')).not.toMatch(/%|احتمال/)
  })

  it('puts inspected zones with nothing recorded into the cleared list', () => {
    const s = inspectionReducer(createInitialState(), { type: 'setZoneStatus', zoneId: 'obd', status: 'inspected', at: 'T' })
    const r = prioritizeZones(s)
    expect(r.clearedZones).toEqual(['obd'])
    expect(r.notInspected).not.toContain('obd')
  })
})
