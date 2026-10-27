// Compares a float32 model against its float16 copy on identical inputs (CPU backend).
// Usage: node scripts/verify-quantized-model.mjs <float32Dir> <float16Dir>
import '@tensorflow/tfjs-backend-cpu'
import * as tf from '@tensorflow/tfjs-core'
import { loadGraphModel } from '@tensorflow/tfjs-converter'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

function fileHandler(dir) {
  return {
    async load() {
      const json = JSON.parse(await readFile(join(dir, 'model.json'), 'utf8'))
      const specs = json.weightsManifest.flatMap((g) => g.weights)
      const buffers = await Promise.all(json.weightsManifest.flatMap((g) => g.paths).map((p) => readFile(join(dir, p))))
      const all = Buffer.concat(buffers)
      return { modelTopology: json.modelTopology, weightSpecs: specs, weightData: all.buffer.slice(all.byteOffset, all.byteOffset + all.length), format: json.format, generatedBy: json.generatedBy, convertedBy: json.convertedBy, signature: json.signature, userDefinedMetadata: json.userDefinedMetadata }
    },
  }
}

const [a, b] = process.argv.slice(2)
await tf.setBackend('cpu')
const m32 = await loadGraphModel(fileHandler(a))
const m16 = await loadGraphModel(fileHandler(b))

let worstScore = 0
let worstBox = 0
for (let seed = 0; seed < 3; seed++) {
  // Smooth synthetic image (gradients + blobs) rather than pure noise, so activations are realistic.
  const img = tf.tidy(() => {
    const y = tf.reshape(tf.linspace(0, 1, 300), [300, 1, 1])
    const x = tf.reshape(tf.linspace(0, 1, 300), [1, 300, 1])
    const c = tf.reshape(tf.tensor1d([0.3 + seed * 0.2, 0.6, 0.9 - seed * 0.2]), [1, 1, 3])
    const wave = tf.sin(tf.mul(tf.add(tf.mul(x, 6 + seed), tf.mul(y, 4)), c))
    return tf.expandDims(tf.cast(tf.mul(tf.add(wave, 1), 127), 'int32'), 0)
  })
  const o32 = await m32.executeAsync(img)
  const o16 = await m16.executeAsync(img)
  for (let i = 0; i < o32.length; i++) {
    const d = (await tf.max(tf.abs(tf.sub(o32[i], o16[i]))).data())[0]
    if (o32[i].shape[o32[i].shape.length - 1] === 4) worstBox = Math.max(worstBox, d)
    else worstScore = Math.max(worstScore, d)
  }
  tf.dispose([img, ...o32, ...o16])
}
console.log(`max |Δ| class scores: ${worstScore.toExponential(2)}, box coords: ${worstBox.toExponential(2)}`)
if (worstScore > 0.02 || worstBox > 0.02) {
  console.error('float16 model diverges too much')
  process.exit(1)
}
console.log('OK: float16 model matches float32 within tolerance')
