export type Box = readonly [x: number, y: number, w: number, h: number]

export interface Detection {
  readonly label: string
  readonly score: number
  /** In source-frame pixels (video intrinsic resolution). */
  readonly box: Box
}

export type TrackState = 'tentative' | 'tracked' | 'lost'

export interface Track {
  readonly id: number
  readonly label: string
  readonly score: number
  readonly box: Box
  readonly hits: number
  readonly misses: number
  readonly state: TrackState
  readonly lastSeen: number
}

export interface TrackerState {
  readonly tracks: readonly Track[]
  readonly nextId: number
}

/** Minimum overlap to consider two boxes the same object in consecutive inferences. */
export const MATCH_IOU = 0.3
/** Matches needed before a track is shown as stable. */
export const CONFIRM_HITS = 3
/** Inference rounds a track may be missing before it is dropped. */
export const MAX_MISSES = 5
/** Box smoothing (0 = frozen, 1 = no smoothing). */
export const SMOOTHING = 0.6

export const EMPTY_TRACKER: TrackerState = { tracks: [], nextId: 1 }

export function iou(a: Box, b: Box): number {
  const x1 = Math.max(a[0], b[0])
  const y1 = Math.max(a[1], b[1])
  const x2 = Math.min(a[0] + a[2], b[0] + b[2])
  const y2 = Math.min(a[1] + a[3], b[1] + b[3])
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = a[2] * a[3] + b[2] * b[3] - inter
  return union > 0 ? inter / union : 0
}

function blend(prev: Box, next: Box): Box {
  const k = SMOOTHING
  return [
    prev[0] + (next[0] - prev[0]) * k,
    prev[1] + (next[1] - prev[1]) * k,
    prev[2] + (next[2] - prev[2]) * k,
    prev[3] + (next[3] - prev[3]) * k,
  ]
}

/**
 * Greedy IoU association between existing tracks and new detections.
 * Same-label pairs are preferred, but a high-overlap pair may switch label (the model's guess changed).
 * IDs only mean "probably the same box as before" — never that the object's identity is known.
 */
export function updateTracks(state: TrackerState, detections: readonly Detection[], now: number): TrackerState {
  const pairs: { t: number; d: number; score: number }[] = []
  state.tracks.forEach((track, t) => {
    detections.forEach((det, d) => {
      const overlap = iou(track.box, det.box)
      if (overlap >= MATCH_IOU) pairs.push({ t, d, score: overlap + (track.label === det.label ? 0.2 : 0) })
    })
  })
  pairs.sort((a, b) => b.score - a.score)

  const trackUsed = new Set<number>()
  const detUsed = new Set<number>()
  const updated = new Map<number, Track>()
  for (const p of pairs) {
    if (trackUsed.has(p.t) || detUsed.has(p.d)) continue
    trackUsed.add(p.t)
    detUsed.add(p.d)
    const track = state.tracks[p.t]!
    const det = detections[p.d]!
    const hits = track.hits + 1
    updated.set(p.t, {
      ...track,
      label: det.label,
      score: det.score,
      box: blend(track.box, det.box),
      hits,
      misses: 0,
      state: hits >= CONFIRM_HITS ? 'tracked' : 'tentative',
      lastSeen: now,
    })
  }

  const kept: Track[] = []
  state.tracks.forEach((track, t) => {
    const match = updated.get(t)
    if (match) return kept.push(match)
    const misses = track.misses + 1
    // Tentative tracks that vanish immediately were probably noise.
    if (misses > MAX_MISSES || (track.state === 'tentative' && misses > 1)) return
    kept.push({ ...track, misses, state: 'lost' })
  })

  let nextId = state.nextId
  detections.forEach((det, d) => {
    if (detUsed.has(d)) return
    kept.push({ id: nextId++, label: det.label, score: det.score, box: det.box, hits: 1, misses: 0, state: 'tentative', lastSeen: now })
  })

  return { tracks: kept, nextId }
}

export const TRACK_STATE_LABEL: Record<TrackState, string> = {
  tentative: 'جديد، غير مستقر بعد',
  tracked: 'متتبَّع',
  lost: 'غير ظاهر مؤقتًا',
}
