import { describe, expect, it } from 'vitest'
import { companyLabel, mapBtError, mergeAdvertisement, type BtAdvertisementEvent } from './bluetooth'

const ad = (over: Partial<BtAdvertisementEvent>): BtAdvertisementEvent =>
  ({ device: { id: 'd1', name: 'Tag' }, ...over }) as unknown as BtAdvertisementEvent

describe('bluetooth helpers', () => {
  it('does not invent RSSI when the platform omits it', () => {
    const d = mergeAdvertisement(undefined, ad({ rssi: null }), 1)
    expect(d.rssiSamples).toEqual([])
    expect(d.count).toBe(1)
  })

  it('accumulates real RSSI samples and manufacturer ids', () => {
    let d = mergeAdvertisement(undefined, ad({ rssi: -70, manufacturerData: new Map([[0x004c, new DataView(new ArrayBuffer(0))]]) }), 1)
    d = mergeAdvertisement(d, ad({ rssi: -55 }), 2)
    expect(d.rssiSamples).toEqual([-70, -55])
    expect(d.companies).toEqual([0x004c])
    expect(d.firstSeen).toBe(1)
    expect(d.lastSeen).toBe(2)
  })

  it('labels company ids without guessing a device type', () => {
    expect(companyLabel(0x004c)).toBe('Apple (0x004C)')
    expect(companyLabel(0x1234)).toBe('0x1234')
  })

  it('maps browser errors', () => {
    expect(mapBtError({ name: 'NotFoundError' })).toBe('cancelled')
    expect(mapBtError({ name: 'SecurityError' })).toBe('denied')
    expect(mapBtError({ name: 'NotSupportedError' })).toBe('unsupported')
    expect(mapBtError(new Error('x'))).toBe('unknown')
  })
})
