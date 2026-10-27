// Re-encodes a TF.js graph model's float32 weights as float16 (same as tensorflowjs_converter --quantize_float16).
// Usage: node scripts/quantize-model.mjs <srcDir> <outDir>
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const [src, out] = process.argv.slice(2)
if (!src || !out) throw new Error('usage: quantize-model.mjs <srcDir> <outDir>')
const SHARD_BYTES = 4 * 1024 * 1024

const model = JSON.parse(await readFile(join(src, 'model.json'), 'utf8'))

// float32 -> IEEE 754 half (round to nearest even), matching TF.js's decoder.
const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)
function toHalf(value) {
  f32[0] = value
  const x = u32[0]
  const sign = (x >>> 16) & 0x8000
  let exp = ((x >>> 23) & 0xff) - 127 + 15
  let mant = x & 0x7fffff
  if (((x >>> 23) & 0xff) === 0xff) return sign | 0x7c00 | (mant ? 0x200 : 0)
  if (exp >= 0x1f) return sign | 0x7c00
  if (exp <= 0) {
    if (exp < -10) return sign
    mant |= 0x800000
    const shift = 14 - exp
    let half = mant >>> shift
    const rem = mant & ((1 << shift) - 1)
    const mid = 1 << (shift - 1)
    if (rem > mid || (rem === mid && half & 1)) half++
    return sign | half
  }
  let half = sign | (exp << 10) | (mant >>> 13)
  const rem = mant & 0x1fff
  if (rem > 0x1000 || (rem === 0x1000 && half & 1)) half++
  return half
}

const BYTES = { float32: 4, int32: 4, bool: 1, uint8: 1 }
const chunks = []
const specs = []
for (const group of model.weightsManifest) {
  const buf = Buffer.concat(await Promise.all(group.paths.map((p) => readFile(join(src, p)))))
  let offset = 0
  for (const w of group.weights) {
    if (w.quantization) throw new Error(`already quantized: ${w.name}`)
    const n = w.shape.reduce((a, b) => a * b, 1)
    const size = n * BYTES[w.dtype]
    if (BYTES[w.dtype] === undefined) throw new Error(`unsupported dtype ${w.dtype} for ${w.name}`)
    const slice = buf.subarray(offset, offset + size)
    offset += size
    if (w.dtype === 'float32') {
      const input = new Float32Array(slice.buffer.slice(slice.byteOffset, slice.byteOffset + size))
      const half = new Uint16Array(n)
      for (let i = 0; i < n; i++) half[i] = toHalf(input[i])
      chunks.push(Buffer.from(half.buffer))
      specs.push({ ...w, quantization: { dtype: 'float16', original_dtype: 'float32' } })
    } else {
      chunks.push(Buffer.from(slice))
      specs.push(w)
    }
  }
  if (offset !== buf.length) throw new Error(`weight bytes mismatch: ${offset} vs ${buf.length}`)
}

const all = Buffer.concat(chunks)
const count = Math.ceil(all.length / SHARD_BYTES)
const paths = []
await mkdir(out, { recursive: true })
for (let i = 0; i < count; i++) {
  const name = `group1-shard${i + 1}of${count}.bin`
  paths.push(name)
  await writeFile(join(out, name), all.subarray(i * SHARD_BYTES, (i + 1) * SHARD_BYTES))
}
const outModel = { ...model, weightsManifest: [{ paths, weights: specs }] }
await writeFile(join(out, 'model.json'), JSON.stringify(outModel))
console.log(`wrote ${count} shards, ${(all.length / 1e6).toFixed(2)} MB weights`)
