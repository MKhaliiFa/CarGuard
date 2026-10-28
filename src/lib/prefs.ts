/**
 * Tiny per-device UI preferences. Inspection data lives in IndexedDB (see storage.ts); this is only for
 * conveniences like "intro already seen". Storage can throw in private mode, so every access is guarded
 * and the app behaves sensibly without it.
 */
const INTRO_KEY = 'carguard.introSeen'

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch (err) {
    console.error('Preference not saved; storage unavailable', err)
  }
}

export function hasSeenIntro(): boolean {
  return read(INTRO_KEY) === '1'
}

export function setIntroSeen(seen: boolean): void {
  write(INTRO_KEY, seen ? '1' : null)
}
