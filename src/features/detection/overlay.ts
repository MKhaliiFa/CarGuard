import { arabicLabel } from './labels'
import type { Box, Track } from './tracker'

/** Maps source-frame pixels to CSS pixels of a container showing the video with object-fit: cover. */
export interface CoverTransform {
  readonly scale: number
  readonly offsetX: number
  readonly offsetY: number
}

export function coverTransform(videoW: number, videoH: number, boxW: number, boxH: number): CoverTransform | undefined {
  if (videoW <= 0 || videoH <= 0 || boxW <= 0 || boxH <= 0) return undefined
  const scale = Math.max(boxW / videoW, boxH / videoH)
  return { scale, offsetX: (boxW - videoW * scale) / 2, offsetY: (boxH - videoH * scale) / 2 }
}

export function toScreen(box: Box, t: CoverTransform): Box {
  return [box[0] * t.scale + t.offsetX, box[1] * t.scale + t.offsetY, box[2] * t.scale, box[3] * t.scale]
}

export function toSource(x: number, y: number, t: CoverTransform): [number, number] {
  return [(x - t.offsetX) / t.scale, (y - t.offsetY) / t.scale]
}

/** Smallest track whose box contains the point (source pixels) — the most specific tap target. */
export function hitTest(tracks: readonly Track[], x: number, y: number): Track | undefined {
  return tracks
    .filter((t) => x >= t.box[0] && x <= t.box[0] + t.box[2] && y >= t.box[1] && y <= t.box[1] + t.box[3])
    .sort((a, b) => a.box[2] * a.box[3] - b.box[2] * b.box[3])[0]
}

/** Neutral, not green: a box marks a generic object class, never a confirmed or suspicious device. */
export const BOX_COLOR = '#e6eeeb'
export const BOX_COLOR_SELECTED = '#8fd3ff'

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  tracks: readonly Track[],
  t: CoverTransform,
  cssW: number,
  cssH: number,
  dpr: number,
  selectedId: number | undefined,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)
  ctx.font = '600 13px "IBM Plex Sans Arabic", system-ui, sans-serif'
  ctx.textBaseline = 'top'
  ctx.direction = 'rtl'
  for (const track of tracks) {
    const [x, y, w, h] = toScreen(track.box, t)
    const selected = track.id === selectedId
    const color = selected ? BOX_COLOR_SELECTED : BOX_COLOR
    ctx.globalAlpha = track.state === 'lost' ? 0.45 : 1
    ctx.lineWidth = selected ? 3 : 2
    ctx.strokeStyle = color
    ctx.setLineDash(track.state === 'tentative' ? [6, 4] : [])
    ctx.strokeRect(x, y, w, h)
    const text = `#${track.id} ${arabicLabel(track.label)} ${Math.round(track.score * 100)}%`
    const tw = ctx.measureText(text).width + 10
    // object-fit: cover crops the frame, so a box can extend past the visible area: keep its label on screen.
    const right = Math.min(Math.max(x + w, tw), cssW)
    const ty = Math.min(y >= 22 ? y - 22 : Math.max(y, 0), cssH - 20)
    ctx.fillStyle = color
    ctx.fillRect(right - tw, ty, tw, 20)
    ctx.fillStyle = '#0a1214'
    ctx.textAlign = 'right'
    ctx.fillText(text, right - 5, ty + 3)
  }
  ctx.globalAlpha = 1
  ctx.setLineDash([])
}
