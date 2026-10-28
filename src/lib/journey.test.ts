import { describe, expect, it } from 'vitest'
import { createInitialState, inspectionReducer, normalizeState } from '../state/inspectionReducer'
import { buildJourney, currentStepIndex, journeyProgress } from './journey'
import type { InspectionState, Observation } from './types'
import { ZONE_IDS } from './zones'

const AT = '2026-10-28T10:00:00.000Z'
const withMag = { magnetometer: true }
const noMag = { magnetometer: false }

function stateOf(id: string, s: InspectionState, caps = withMag) {
  const step = buildJourney(s, caps).find((x) => x.id === id)
  if (!step) throw new Error(`missing step ${id}`)
  return step.state
}

function magneticObs(classification: Observation['classification']): Observation {
  return { id: `o-${classification}`, zoneId: 'obd', kind: 'magnetic', source: 'sensor', classification, text: 'x', createdAt: AT }
}

describe('buildJourney', () => {
  it('starts with seven steps, the first one current, and zero progress', () => {
    const s = createInitialState()
    const steps = buildJourney(s, withMag)
    expect(steps.map((x) => x.id)).toEqual(['prepare', 'visual', 'sensor', 'radio', 'record', 'review', 'report'])
    expect(currentStepIndex(steps)).toBe(0)
    expect(journeyProgress(steps, s)).toBe(0)
  })

  it('marks the sensor step unavailable when the browser has no magnetometer, never as todo', () => {
    expect(stateOf('sensor', createInitialState(), noMag)).toBe('unavailable')
  })

  it('leaves unavailable steps out of progress instead of counting them as done', () => {
    const s = createInitialState()
    expect(journeyProgress(buildJourney(s, noMag), s)).toBe(0)
    const marked = inspectionReducer(s, { type: 'setStepMark', step: 'prepare', mark: 'done' })
    expect(journeyProgress(buildJourney(marked, noMag), marked)).toBeCloseTo(1 / 6)
  })

  it('treats magnetic readings without a clear change as inconclusive, not done', () => {
    let s = inspectionReducer(createInitialState(), { type: 'setBaseline', baseline: { meanMicroTesla: 40, noiseMicroTesla: 1, sampleCount: 50, at: AT } })
    s = inspectionReducer(s, { type: 'addObservation', observation: magneticObs('inconclusive') })
    expect(stateOf('sensor', s)).toBe('inconclusive')
    s = inspectionReducer(s, { type: 'addObservation', observation: { ...magneticObs('suspicious'), id: 'o2' } })
    expect(stateOf('sensor', s)).toBe('done')
  })

  it('tracks visual progress per zone and completes when every zone has a status', () => {
    let s = inspectionReducer(createInitialState(), { type: 'setZoneStatus', zoneId: 'obd', status: 'inspected', at: AT })
    expect(stateOf('visual', s)).toBe('progress')
    for (const id of ZONE_IDS) s = inspectionReducer(s, { type: 'setZoneStatus', zoneId: id, status: 'inspected', at: AT })
    expect(stateOf('visual', s)).toBe('done')
  })

  it('records an unavailable OS check as inconclusive', () => {
    const s = inspectionReducer(createInitialState(), { type: 'setOsCheck', platform: 'ios', result: 'not_available', at: AT })
    expect(stateOf('radio', s)).toBe('inconclusive')
  })

  it('honours skip and done marks, and moves the current step forward', () => {
    let s = inspectionReducer(createInitialState(), { type: 'setStepMark', step: 'prepare', mark: 'done' })
    s = inspectionReducer(s, { type: 'setStepMark', step: 'visual', mark: 'skipped' })
    const steps = buildJourney(s, withMag)
    expect(steps[0]?.state).toBe('done')
    expect(steps[1]?.state).toBe('skipped')
    expect(currentStepIndex(steps)).toBe(2)
    expect(journeyProgress(steps, s)).toBeCloseTo(2 / 7)
  })

  it('clears a mark when set to undefined', () => {
    let s = inspectionReducer(createInitialState(), { type: 'setStepMark', step: 'report', mark: 'done' })
    s = inspectionReducer(s, { type: 'setStepMark', step: 'report', mark: undefined })
    expect(stateOf('report', s)).toBe('todo')
  })

  it('lets real data override a skip mark', () => {
    let s = inspectionReducer(createInitialState(), { type: 'setStepMark', step: 'radio', mark: 'skipped' })
    s = inspectionReducer(s, { type: 'setOsCheck', platform: 'android', result: 'no_alert', at: AT })
    expect(stateOf('radio', s)).toBe('done')
  })

  it('reports the last step as current when every step is resolved', () => {
    let s = createInitialState()
    for (const step of ['prepare', 'visual', 'sensor', 'radio', 'record', 'review', 'report'] as const) {
      s = inspectionReducer(s, { type: 'setStepMark', step, mark: 'skipped' })
    }
    const steps = buildJourney(s, withMag)
    expect(currentStepIndex(steps)).toBe(6)
    expect(journeyProgress(steps, s)).toBe(1)
  })
})

describe('step marks persistence', () => {
  it('keeps valid marks and drops garbage when normalizing persisted state', () => {
    const raw = { ...createInitialState(), stepMarks: { prepare: 'done', visual: 'bogus', nope: 'done', report: 'skipped' } }
    expect(normalizeState(raw).stepMarks).toEqual({ prepare: 'done', report: 'skipped' })
  })

  it('reset clears marks', () => {
    const s = inspectionReducer(createInitialState(), { type: 'setStepMark', step: 'prepare', mark: 'done' })
    expect(inspectionReducer(s, { type: 'reset' }).stepMarks).toBeUndefined()
  })
})
