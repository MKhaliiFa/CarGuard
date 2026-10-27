import { describe, expect, it } from 'vitest'
import { detectCapabilities, detectPlatform } from './capabilities'

function fakeWindow(extra: Record<string, unknown> = {}, nav: Record<string, unknown> = {}) {
  return {
    isSecureContext: true,
    matchMedia: () => ({ matches: false }),
    navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', maxTouchPoints: 5, ...nav },
    ...extra,
  } as unknown as Window & typeof globalThis
}

describe('capabilities', () => {
  it('detects platforms', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; CPH2637)', 5)).toBe('android')
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe('desktop')
  })

  it('reports everything unsupported on a bare iPhone-like browser', () => {
    const c = detectCapabilities(fakeWindow())
    expect(c.magnetometer).toBe(false)
    expect(c.webBluetooth).toBe(false)
    expect(c.bluetoothLeScan).toBe(false)
    expect(c.camera).toBe(false)
    expect(c.platform).toBe('ios')
  })

  it('detects APIs only when they actually exist', () => {
    const c = detectCapabilities(
      fakeWindow({ Magnetometer: class {}, DeviceOrientationEvent: { requestPermission: async () => 'granted' } }, {
        userAgent: 'Android',
        bluetooth: { requestDevice: () => undefined },
        mediaDevices: { getUserMedia: () => undefined },
      }),
    )
    expect(c.magnetometer).toBe(true)
    expect(c.webBluetooth).toBe(true)
    expect(c.bluetoothLeScan).toBe(false)
    expect(c.camera).toBe(true)
    expect(c.orientationNeedsPermission).toBe(true)
  })
})
