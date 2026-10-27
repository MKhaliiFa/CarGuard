import { describe, expect, it } from 'vitest'
import type { Observation } from '../lib/types'
import { createInitialState, inspectionReducer, normalizeState } from './inspectionReducer'

const obs = (over: Partial<Observation> = {}): Observation => ({
  id: 'o1', zoneId: 'obd', kind: 'note', source: 'user', classification: 'suspicious', text: 'x', createdAt: '2026-10-27T10:00:00.000Z', ...over,
})

describe('inspectionReducer', () => {
  it('starts with every zone not inspected and no observations', () => {
    const s = createInitialState()
    expect(Object.values(s.zones).every((z) => z.status === 'not_inspected')).toBe(true)
    expect(s.observations).toEqual([])
  })

  it('records the first inspection timestamp and keeps it on later status changes', () => {
    let s = inspectionReducer(createInitialState(), { type: 'setZoneStatus', zoneId: 'obd', status: 'inspected', at: 'T1' })
    s = inspectionReducer(s, { type: 'setZoneStatus', zoneId: 'obd', status: 'needs_followup', at: 'T2' })
    expect(s.zones.obd.inspectedAt).toBe('T1')
    expect(s.zones.obd.status).toBe('needs_followup')
    s = inspectionReducer(s, { type: 'setZoneStatus', zoneId: 'obd', status: 'not_inspected', at: 'T3' })
    expect(s.zones.obd.inspectedAt).toBeUndefined()
  })

  it('does not mutate the previous state', () => {
    const before = createInitialState()
    const after = inspectionReducer(before, { type: 'setZoneNotes', zoneId: 'obd', notes: 'hi', at: 'T' })
    expect(before.zones.obd.notes).toBe('')
    expect(after.zones.obd.notes).toBe('hi')
  })

  it('never lets sensor or bluetooth data become "confirmed"', () => {
    let s = inspectionReducer(createInitialState(), { type: 'addObservation', observation: obs({ id: 's', source: 'sensor', classification: 'confirmed' }) })
    s = inspectionReducer(s, { type: 'addObservation', observation: obs({ id: 'b', source: 'bluetooth', classification: 'confirmed' }) })
    expect(s.observations.map((o) => o.classification)).toEqual(['suspicious', 'suspicious'])
    s = inspectionReducer(s, { type: 'reclassifyObservation', id: 's', classification: 'confirmed' })
    expect(s.observations[0]!.classification).toBe('suspicious')
  })

  it('lets the user confirm their own observation', () => {
    const s = inspectionReducer(createInitialState(), { type: 'addObservation', observation: obs({ classification: 'confirmed' }) })
    expect(s.observations[0]!.classification).toBe('confirmed')
  })

  it('removes observations tied to a deleted photo', () => {
    let s = inspectionReducer(createInitialState(), { type: 'attachPhoto', zoneId: 'obd', photoId: 'p1', at: 'T' })
    s = inspectionReducer(s, { type: 'addObservation', observation: obs({ photoId: 'p1' }) })
    s = inspectionReducer(s, { type: 'detachPhoto', zoneId: 'obd', photoId: 'p1', at: 'T' })
    expect(s.zones.obd.photoIds).toEqual([])
    expect(s.observations).toEqual([])
  })

  it('normalizes unknown or corrupt persisted data', () => {
    expect(normalizeState(null)).toEqual(createInitialState())
    expect(normalizeState({ version: 99 })).toEqual(createInitialState())
    const restored = normalizeState({ version: 1, zones: { obd: { status: 'inspected', notes: 'n', photoIds: [] } }, observations: [obs({ source: 'sensor', classification: 'confirmed' }), { zoneId: 'nope' }] })
    expect(restored.zones.obd.status).toBe('inspected')
    expect(restored.zones['trunk-spare'].status).toBe('not_inspected')
    expect(restored.observations).toHaveLength(1)
    expect(restored.observations[0]!.classification).toBe('suspicious')
  })
})
