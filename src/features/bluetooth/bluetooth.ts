/** Minimal Web Bluetooth typings — only what we call. Not part of lib.dom. */
export interface BtDevice extends EventTarget {
  readonly id: string
  readonly name?: string | null
  watchAdvertisements?: (options?: { signal?: AbortSignal }) => Promise<void>
}

export interface BtAdvertisementEvent extends Event {
  readonly device: BtDevice
  readonly rssi?: number | null
  readonly txPower?: number | null
  readonly manufacturerData?: Map<number, DataView>
  readonly uuids?: readonly string[]
}

export interface BtScan {
  readonly active: boolean
  stop(): void
}

export interface BtApi extends EventTarget {
  getAvailability?: () => Promise<boolean>
  requestDevice(options: { acceptAllDevices: true; optionalServices?: string[] }): Promise<BtDevice>
  requestLEScan?: (options: { acceptAllAdvertisements: true; keepRepeatedDevices?: boolean }) => Promise<BtScan>
}

export function getBluetooth(nav: Navigator = navigator): BtApi | undefined {
  return (nav as Navigator & { bluetooth?: BtApi }).bluetooth
}

export type BtErrorCode = 'cancelled' | 'denied' | 'unavailable' | 'unsupported' | 'unknown'

export const BT_ERROR_TEXT: Record<BtErrorCode, string> = {
  cancelled: 'لم يتم اختيار أي جهاز. نافذة الاختيار أُغلقت أو لم تظهر أجهزة فيها.',
  denied: 'رفض المتصفح أو النظام إذن البلوتوث. تأكد من السماح للمتصفح بالوصول للأجهزة القريبة وإذن الموقع على أندرويد.',
  unavailable: 'البلوتوث مغلق أو غير متاح على هذا الجهاز.',
  unsupported: 'هذه الميزة غير مدعومة في هذا المتصفح.',
  unknown: 'حدث خطأ غير متوقع أثناء استخدام البلوتوث.',
}

export function mapBtError(err: unknown): BtErrorCode {
  const name = (err as { name?: string } | undefined)?.name ?? ''
  if (name === 'NotFoundError' || name === 'AbortError') return 'cancelled'
  if (name === 'SecurityError' || name === 'NotAllowedError') return 'denied'
  if (name === 'NotSupportedError') return 'unsupported'
  if (name === 'InvalidStateError' || name === 'NetworkError') return 'unavailable'
  return 'unknown'
}

/** Well-known Bluetooth SIG company identifiers. A match only names the manufacturer, never the device type. */
const COMPANY_NAMES: Record<number, string> = {
  0x004c: 'Apple',
  0x0075: 'Samsung',
  0x00e0: 'Google',
  0x0006: 'Microsoft',
  0x0157: 'Huami',
  0x027d: 'Huawei',
  0x038f: 'Xiaomi',
  0x0a4f: 'OPPO',
}

export function companyLabel(id: number): string {
  const hex = `0x${id.toString(16).padStart(4, '0').toUpperCase()}`
  const name = COMPANY_NAMES[id]
  return name ? `${name} (${hex})` : hex
}

export interface SeenDevice {
  readonly id: string
  readonly name?: string
  readonly rssiSamples: readonly number[]
  readonly txPower?: number
  readonly companies: readonly number[]
  readonly firstSeen: number
  readonly lastSeen: number
  readonly count: number
}

const MAX_RSSI_SAMPLES = 50

/** Folds one real advertisement into the aggregate. Ignores missing RSSI rather than inventing one. */
export function mergeAdvertisement(prev: SeenDevice | undefined, ev: BtAdvertisementEvent, now: number): SeenDevice {
  const rssi = typeof ev.rssi === 'number' ? ev.rssi : undefined
  const companies = ev.manufacturerData ? [...ev.manufacturerData.keys()] : []
  return {
    id: ev.device.id,
    name: ev.device.name ?? prev?.name ?? undefined,
    rssiSamples: rssi === undefined ? (prev?.rssiSamples ?? []) : [...(prev?.rssiSamples ?? []), rssi].slice(-MAX_RSSI_SAMPLES),
    txPower: typeof ev.txPower === 'number' ? ev.txPower : prev?.txPower,
    companies: [...new Set([...(prev?.companies ?? []), ...companies])],
    firstSeen: prev?.firstSeen ?? now,
    lastSeen: now,
    count: (prev?.count ?? 0) + 1,
  }
}
