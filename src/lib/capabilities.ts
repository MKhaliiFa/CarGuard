export type Platform = 'ios' | 'android' | 'desktop' | 'unknown'

export interface Capabilities {
  readonly secureContext: boolean
  readonly camera: boolean
  readonly magnetometer: boolean
  readonly deviceOrientation: boolean
  readonly orientationNeedsPermission: boolean
  readonly webBluetooth: boolean
  readonly bluetoothLeScan: boolean
  readonly indexedDb: boolean
  readonly serviceWorker: boolean
  readonly standalone: boolean
  readonly platform: Platform
}

interface OrientationEventCtor {
  requestPermission?: () => Promise<PermissionState>
}

export function detectPlatform(ua: string, maxTouchPoints: number): Platform {
  if (/android/i.test(ua)) return 'android'
  // iPadOS reports itself as Mac; touch points tell them apart.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && maxTouchPoints > 1)) return 'ios'
  if (/windows|macintosh|linux|cros/i.test(ua)) return 'desktop'
  return 'unknown'
}

export function detectCapabilities(win: Window & typeof globalThis = window): Capabilities {
  const nav = win.navigator
  const bluetooth = (nav as Navigator & { bluetooth?: { requestLEScan?: unknown } }).bluetooth
  const orientationCtor = (win as unknown as { DeviceOrientationEvent?: OrientationEventCtor }).DeviceOrientationEvent
  const standalone =
    (typeof win.matchMedia === 'function' && win.matchMedia('(display-mode: standalone)').matches) ||
    (nav as Navigator & { standalone?: boolean }).standalone === true

  return {
    secureContext: win.isSecureContext === true,
    camera: typeof nav.mediaDevices?.getUserMedia === 'function',
    magnetometer: 'Magnetometer' in win,
    deviceOrientation: orientationCtor !== undefined,
    orientationNeedsPermission: typeof orientationCtor?.requestPermission === 'function',
    webBluetooth: bluetooth !== undefined,
    bluetoothLeScan: typeof bluetooth?.requestLEScan === 'function',
    indexedDb: 'indexedDB' in win,
    serviceWorker: 'serviceWorker' in nav,
    standalone,
    platform: detectPlatform(nav.userAgent, nav.maxTouchPoints ?? 0),
  }
}
