import type { Classification } from './types'

export interface SampleStats {
  readonly mean: number
  readonly stdDev: number
  readonly min: number
  readonly max: number
  readonly count: number
}

/** Minimum change (µT) we are willing to call "suspicious"; smaller shifts happen just from moving the phone. */
export const MIN_SUSPICIOUS_DELTA_UT = 15
/** A change must also exceed this many times the baseline noise. */
export const NOISE_MULTIPLIER = 4
/** Fewer samples than this is not enough to describe a reading. */
export const MIN_SAMPLES = 5

export function magnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z)
}

export function computeStats(samples: readonly number[]): SampleStats | undefined {
  const finite = samples.filter((s) => Number.isFinite(s))
  if (finite.length === 0) return undefined
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length
  const variance = finite.reduce((a, b) => a + (b - mean) ** 2, 0) / finite.length
  return { mean, stdDev: Math.sqrt(variance), min: Math.min(...finite), max: Math.max(...finite), count: finite.length }
}

export type Stability = 'stable' | 'moderate' | 'unstable'

export function describeStability(stdDev: number): Stability {
  if (stdDev < 1.5) return 'stable'
  if (stdDev < 5) return 'moderate'
  return 'unstable'
}

/**
 * Classifies a zone reading against the baseline. The best possible outcome is "suspicious":
 * a magnetic change can come from speakers, motors, seat rails or the car body itself.
 */
export function classifyMagneticDelta(delta: number, baselineNoise: number, sampleCount: number): Classification {
  if (sampleCount < MIN_SAMPLES) return 'inconclusive'
  const threshold = Math.max(MIN_SUSPICIOUS_DELTA_UT, NOISE_MULTIPLIER * baselineNoise)
  return Math.abs(delta) >= threshold ? 'suspicious' : 'inconclusive'
}
