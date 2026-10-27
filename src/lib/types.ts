export type ZoneId =
  | 'exterior'
  | 'underbody'
  | 'grille-engine'
  | 'dashboard-fuse'
  | 'obd'
  | 'front-seats'
  | 'rear-seats'
  | 'seat-undersides'
  | 'console-storage'
  | 'trunk-spare'
  | 'battery-wiring'

export type ZoneStatus = 'not_inspected' | 'inspected' | 'needs_followup'

/**
 * confirmed    — the USER physically saw and verified something (the app never sets this on its own).
 * suspicious   — an indicator worth a closer look; not proof.
 * inconclusive — recorded data that does not point either way.
 */
export type Classification = 'confirmed' | 'suspicious' | 'inconclusive'

/** Who produced the observation. Only 'user' may carry the 'confirmed' classification. */
export type ObservationSource = 'user' | 'sensor' | 'bluetooth'

export type ObservationKind = 'visual' | 'magnetic' | 'bluetooth' | 'note'

export interface MagneticMeasurement {
  readonly baselineMicroTesla: number
  readonly meanMicroTesla: number
  readonly deltaMicroTesla: number
  readonly baselineNoiseMicroTesla: number
  readonly sampleCount: number
}

export interface Observation {
  readonly id: string
  readonly zoneId: ZoneId
  readonly kind: ObservationKind
  readonly source: ObservationSource
  readonly classification: Classification
  readonly text: string
  readonly createdAt: string
  readonly photoId?: string
  readonly magnetic?: MagneticMeasurement
}

export interface ZoneRecord {
  readonly status: ZoneStatus
  readonly notes: string
  readonly photoIds: readonly string[]
  readonly inspectedAt?: string
  readonly updatedAt?: string
}

export type OsCheckResult = 'no_alert' | 'alert_shown' | 'not_available'

export interface OsCheckRecord {
  readonly result?: OsCheckResult
  readonly at?: string
}

export interface MagneticBaseline {
  readonly meanMicroTesla: number
  readonly noiseMicroTesla: number
  readonly sampleCount: number
  readonly at: string
}

export interface InspectionState {
  readonly version: 1
  readonly zones: Readonly<Record<ZoneId, ZoneRecord>>
  readonly observations: readonly Observation[]
  readonly osChecks: Readonly<{ android: OsCheckRecord; ios: OsCheckRecord }>
  readonly bluetoothChecked: boolean
  readonly magneticBaseline?: MagneticBaseline
}
