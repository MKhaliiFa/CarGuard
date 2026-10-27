import { describe, expect, it } from 'vitest'
import { classifyMagneticDelta, computeStats, describeStability, magnitude } from './magnetics'
import { headingSpread } from '../features/sensors/useCompassHeading'

describe('magnetics', () => {
  it('computes vector magnitude', () => {
    expect(magnitude(3, 4, 0)).toBe(5)
  })

  it('returns undefined stats for no samples instead of inventing a value', () => {
    expect(computeStats([])).toBeUndefined()
    expect(computeStats([NaN, Infinity])).toBeUndefined()
  })

  it('computes mean and standard deviation', () => {
    const s = computeStats([2, 4, 4, 4, 5, 5, 7, 9])!
    expect(s.mean).toBe(5)
    expect(s.stdDev).toBe(2)
    expect(s.count).toBe(8)
  })

  it('never classifies a magnetic change as confirmed', () => {
    expect(classifyMagneticDelta(500, 0.1, 50)).toBe('suspicious')
    expect(classifyMagneticDelta(-500, 0.1, 50)).toBe('suspicious')
  })

  it('treats small changes, noisy baselines, and too few samples as inconclusive', () => {
    expect(classifyMagneticDelta(10, 0.5, 50)).toBe('inconclusive')
    expect(classifyMagneticDelta(30, 10, 50)).toBe('inconclusive')
    expect(classifyMagneticDelta(300, 0.5, 3)).toBe('inconclusive')
  })

  it('describes stability', () => {
    expect(describeStability(0.5)).toBe('stable')
    expect(describeStability(3)).toBe('moderate')
    expect(describeStability(9)).toBe('unstable')
  })

  it('measures compass heading spread across the 0/360 wrap', () => {
    expect(headingSpread([358, 2, 1])).toBe(4)
    expect(headingSpread([10, 50])).toBe(40)
    expect(headingSpread([5])).toBe(0)
  })
})
