import { ZONE_IDS } from '../lib/zones'
import type {
  Classification,
  InspectionState,
  MagneticBaseline,
  Observation,
  OsCheckResult,
  ZoneId,
  ZoneRecord,
  ZoneStatus,
} from '../lib/types'

export type InspectionAction =
  | { type: 'hydrate'; state: InspectionState }
  | { type: 'reset' }
  | { type: 'setZoneStatus'; zoneId: ZoneId; status: ZoneStatus; at: string }
  | { type: 'setZoneNotes'; zoneId: ZoneId; notes: string; at: string }
  | { type: 'attachPhoto'; zoneId: ZoneId; photoId: string; at: string }
  | { type: 'detachPhoto'; zoneId: ZoneId; photoId: string; at: string }
  | { type: 'addObservation'; observation: Observation }
  | { type: 'reclassifyObservation'; id: string; classification: Classification }
  | { type: 'removeObservation'; id: string }
  | { type: 'setBaseline'; baseline: MagneticBaseline | undefined }
  | { type: 'setOsCheck'; platform: 'android' | 'ios'; result: OsCheckResult; at: string }
  | { type: 'markBluetoothChecked' }

const EMPTY_ZONE: ZoneRecord = { status: 'not_inspected', notes: '', photoIds: [] }

export function createInitialState(): InspectionState {
  const zones = Object.fromEntries(ZONE_IDS.map((id) => [id, EMPTY_ZONE])) as Record<ZoneId, ZoneRecord>
  return { version: 1, zones, observations: [], osChecks: { android: {}, ios: {} }, bluetoothChecked: false }
}

/**
 * Only the user can confirm something. Sensor- or Bluetooth-sourced data is capped at "suspicious"
 * so the app can never turn a reading into a claimed detection.
 */
export function enforceClassification(observation: Observation): Observation {
  if (observation.source !== 'user' && observation.classification === 'confirmed') {
    return { ...observation, classification: 'suspicious' }
  }
  return observation
}

function updateZone(state: InspectionState, zoneId: ZoneId, patch: (z: ZoneRecord) => ZoneRecord): InspectionState {
  return { ...state, zones: { ...state.zones, [zoneId]: patch(state.zones[zoneId]) } }
}

export function inspectionReducer(state: InspectionState, action: InspectionAction): InspectionState {
  switch (action.type) {
    case 'hydrate':
      return action.state
    case 'reset':
      return createInitialState()
    case 'setZoneStatus':
      return updateZone(state, action.zoneId, (z) => ({
        ...z,
        status: action.status,
        updatedAt: action.at,
        inspectedAt: action.status === 'not_inspected' ? undefined : (z.inspectedAt ?? action.at),
      }))
    case 'setZoneNotes':
      return updateZone(state, action.zoneId, (z) => ({ ...z, notes: action.notes, updatedAt: action.at }))
    case 'attachPhoto':
      return updateZone(state, action.zoneId, (z) =>
        z.photoIds.includes(action.photoId) ? z : { ...z, photoIds: [...z.photoIds, action.photoId], updatedAt: action.at },
      )
    case 'detachPhoto':
      return {
        ...updateZone(state, action.zoneId, (z) => ({
          ...z,
          photoIds: z.photoIds.filter((p) => p !== action.photoId),
          updatedAt: action.at,
        })),
        observations: state.observations.filter((o) => o.photoId !== action.photoId),
      }
    case 'addObservation':
      return { ...state, observations: [...state.observations, enforceClassification(action.observation)] }
    case 'reclassifyObservation':
      return {
        ...state,
        observations: state.observations.map((o) =>
          o.id === action.id ? enforceClassification({ ...o, classification: action.classification }) : o,
        ),
      }
    case 'removeObservation':
      return { ...state, observations: state.observations.filter((o) => o.id !== action.id) }
    case 'setBaseline':
      return { ...state, magneticBaseline: action.baseline }
    case 'setOsCheck':
      return { ...state, osChecks: { ...state.osChecks, [action.platform]: { result: action.result, at: action.at } } }
    case 'markBluetoothChecked':
      return { ...state, bluetoothChecked: true }
  }
}

/** Accepts unknown persisted data and returns a valid state, filling any missing zones. */
export function normalizeState(raw: unknown): InspectionState {
  const initial = createInitialState()
  if (!raw || typeof raw !== 'object' || (raw as { version?: unknown }).version !== 1) return initial
  const candidate = raw as Partial<InspectionState>
  const zones = { ...initial.zones }
  for (const id of ZONE_IDS) {
    const z = candidate.zones?.[id]
    if (z && typeof z === 'object' && Array.isArray(z.photoIds)) zones[id] = { ...EMPTY_ZONE, ...z }
  }
  const observations = Array.isArray(candidate.observations)
    ? candidate.observations.filter((o): o is Observation => !!o && ZONE_IDS.includes(o.zoneId)).map(enforceClassification)
    : []
  return {
    ...initial,
    zones,
    observations,
    osChecks: { android: candidate.osChecks?.android ?? {}, ios: candidate.osChecks?.ios ?? {} },
    bluetoothChecked: candidate.bluetoothChecked === true,
    magneticBaseline: candidate.magneticBaseline,
  }
}
