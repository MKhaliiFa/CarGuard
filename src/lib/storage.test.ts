import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState, inspectionReducer } from '../state/inspectionReducer'
import { deleteAllData, listPhotoIds, loadPhoto, loadState, resetStorageHandle, savePhoto, saveState } from './storage'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetStorageHandle()
})

describe('local storage', () => {
  it('returns a fresh state when nothing is stored', async () => {
    expect(await loadState()).toEqual(createInitialState())
  })

  it('persists and reloads inspection state', async () => {
    const s = inspectionReducer(createInitialState(), { type: 'setZoneStatus', zoneId: 'obd', status: 'needs_followup', at: '2026-10-27T10:00:00.000Z' })
    await saveState(s)
    resetStorageHandle()
    const loaded = await loadState()
    expect(loaded.zones.obd.status).toBe('needs_followup')
    expect(loaded.zones.obd.inspectedAt).toBe('2026-10-27T10:00:00.000Z')
  })

  it('stores photos separately and lists them', async () => {
    await savePhoto({ id: 'p1', zoneId: 'obd', blob: new Blob(['abc'], { type: 'image/jpeg' }), createdAt: 'T' })
    expect(await listPhotoIds()).toEqual(['p1'])
    expect((await loadPhoto('p1'))?.zoneId).toBe('obd')
  })

  it('delete-all removes state and photos', async () => {
    await saveState(inspectionReducer(createInitialState(), { type: 'setZoneNotes', zoneId: 'obd', notes: 'secret', at: 'T' }))
    await savePhoto({ id: 'p1', zoneId: 'obd', blob: new Blob(['abc']), createdAt: 'T' })
    await deleteAllData()
    expect(await listPhotoIds()).toEqual([])
    expect((await loadState()).zones.obd.notes).toBe('')
  })
})
