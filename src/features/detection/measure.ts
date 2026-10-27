import type { Box } from './tracker'

/**
 * Pixel → centimetre calibration from a reference object of known width,
 * held parallel to the camera at the same distance as the objects being measured.
 */
export interface Calibration {
  readonly cmPerPx: number
  readonly referenceName: string
  readonly referenceWidthCm: number
  readonly referenceWidthPx: number
  /** Camera + zoom the calibration was taken with; any change invalidates it. */
  readonly cameraKey: string
  readonly at: string
}

export interface ReferencePreset {
  readonly id: string
  readonly name: string
  readonly widthCm: number
}

export const REFERENCE_PRESETS: readonly ReferencePreset[] = [
  { id: 'card', name: 'بطاقة بنكية (العرض الطويل)', widthCm: 8.56 },
  { id: 'a4-short', name: 'ورقة A4 (الضلع القصير)', widthCm: 21.0 },
  { id: 'a4-long', name: 'ورقة A4 (الضلع الطويل)', widthCm: 29.7 },
]

/** Bounding boxes rarely hug the object exactly; we assume ±10% fit error on each box. */
export const BOX_FIT_ERROR = 0.1
/** Plus about ±2 px of edge quantisation on each box edge. */
export const EDGE_ERROR_PX = 2
/** Smaller reference boxes give a calibration too coarse to be useful. */
export const MIN_REFERENCE_PX = 40

export const WEIGHT_UNAVAILABLE = 'غير متاح — لا يمكن قياس الوزن من صورة، ولا توجد طريقة تقدير موثّقة في التطبيق.'

export function pixelSize(box: Box): { widthPx: number; heightPx: number } {
  return { widthPx: Math.round(box[2]), heightPx: Math.round(box[3]) }
}

export function cameraKey(deviceId: string | undefined, zoom: number | undefined): string {
  return `${deviceId ?? 'default'}@${zoom ?? 1}`
}

export function calibrate(
  referenceBox: Box,
  referenceWidthCm: number,
  referenceName: string,
  key: string,
  at: string,
): Calibration | { error: string } {
  if (!(referenceWidthCm > 0) || !Number.isFinite(referenceWidthCm)) return { error: 'أدخل عرضًا حقيقيًا أكبر من صفر.' }
  if (referenceBox[2] < MIN_REFERENCE_PX) return { error: `جسم المرجع صغير جدًا في الصورة (أقل من ${MIN_REFERENCE_PX} بكسل). قرّب الكاميرا.` }
  return { cmPerPx: referenceWidthCm / referenceBox[2], referenceName, referenceWidthCm, referenceWidthPx: referenceBox[2], cameraKey: key, at }
}

export interface SizeEstimate {
  readonly widthCm: number
  readonly heightCm: number
  readonly widthErrCm: number
  readonly heightErrCm: number
}

/**
 * Returns undefined unless a calibration exists for the same camera and zoom.
 * The error bars cover box fit and pixel quantisation only — NOT perspective or depth differences,
 * which can make the true size arbitrarily different.
 */
export function estimateSize(box: Box, calibration: Calibration | undefined, key: string): SizeEstimate | undefined {
  if (!calibration || calibration.cameraKey !== key) return undefined
  const refRel = BOX_FIT_ERROR + EDGE_ERROR_PX / calibration.referenceWidthPx
  const rel = (px: number) => refRel + BOX_FIT_ERROR + EDGE_ERROR_PX / Math.max(px, 1)
  const widthCm = box[2] * calibration.cmPerPx
  const heightCm = box[3] * calibration.cmPerPx
  return { widthCm, heightCm, widthErrCm: widthCm * rel(box[2]), heightErrCm: heightCm * rel(box[3]) }
}
