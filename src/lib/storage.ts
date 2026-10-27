import { clear, createStore, del, get, keys, set, type UseStore } from 'idb-keyval'
import { normalizeState } from '../state/inspectionReducer'
import type { InspectionState, ZoneId } from './types'

const STATE_KEY = 'inspection-state'
const PHOTO_PREFIX = 'photo:'

export interface StoredPhoto {
  readonly id: string
  readonly zoneId: ZoneId
  readonly blob: Blob
  readonly createdAt: string
  readonly width?: number
  readonly height?: number
}

let store: UseStore | undefined

function db(): UseStore {
  store ??= createStore('carguard', 'kv')
  return store
}

/** For tests: forget the cached handle so a fresh fake-indexeddb is used. */
export function resetStorageHandle(): void {
  store = undefined
}

export function isStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

export async function loadState(): Promise<InspectionState> {
  const raw = await get<unknown>(STATE_KEY, db())
  return normalizeState(raw)
}

export async function saveState(state: InspectionState): Promise<void> {
  await set(STATE_KEY, state, db())
}

export async function savePhoto(photo: StoredPhoto): Promise<void> {
  await set(PHOTO_PREFIX + photo.id, photo, db())
}

export async function loadPhoto(id: string): Promise<StoredPhoto | undefined> {
  return get<StoredPhoto>(PHOTO_PREFIX + id, db())
}

export async function deletePhoto(id: string): Promise<void> {
  await del(PHOTO_PREFIX + id, db())
}

export async function listPhotoIds(): Promise<string[]> {
  const all = await keys(db())
  return all.filter((k): k is string => typeof k === 'string' && k.startsWith(PHOTO_PREFIX)).map((k) => k.slice(PHOTO_PREFIX.length))
}

/** Removes everything CarGuard stored on this device: state, photos, and the offline cache. */
export async function deleteAllData(): Promise<void> {
  await clear(db())
  try {
    localStorage.clear()
  } catch {
    // localStorage can be unavailable in private mode; nothing stored there to lose.
  }
  if (typeof caches !== 'undefined') {
    const names = await caches.keys()
    await Promise.all(names.map((n) => caches.delete(n)))
  }
}

/** Ask the browser not to evict our data under storage pressure (best effort). */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
