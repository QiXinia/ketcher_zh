/** Bitmap encoders for the editor's already-rendered PNG preview. */
export type KetcherRasterFormat = 'jpeg' | 'bmp' | 'tiff' | 'gif'

const MAX_PIXELS = 16_000_000

export const KETCHER_RASTER_FORMATS: ReadonlyArray<{
  format: KetcherRasterFormat
  label: string
  extension: string
  mimeType: string
}> = [
  { format: 'jpeg', label: 'JPEG', extension: 'jpg', mimeType: 'image/jpeg' },
  { format: 'bmp', label: 'BMP', extension: 'bmp', mimeType: 'image/bmp' },
  { format: 'tiff', label: 'TIFF', extension: 'tiff', mimeType: 'image/tiff' },
  { format: 'gif', label: 'GIF', extension: 'gif', mimeType: 'image/gif' },
]

export function isKetcherRasterFormat(value: string): value is KetcherRasterFormat {
  return KETCHER_RASTER_FORMATS.some(item => item.format === value)
}

function validatePixels(pixels: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0
    || width > 65535 || height > 65535 || width * height > MAX_PIXELS
    || pixels.length !== width * height * 4) {
    throw new Error('位图尺寸或像素数据无效，最大支持 1600 万像素')
  }
}

function onWhite(channel: number, alpha: number) {
  return Math.round((channel * alpha + 255 * (255 - alpha)) / 255)
}

function writeRgb(target: Uint8Array, offset: number, pixels: Uint8Array | Uint8ClampedArray, source: number) {
  const alpha = pixels[source + 3]
  target[offset] = onWhite(pixels[source], alpha)
  target[offset + 1] = onWhite(pixels[source + 1], alpha)
  target[offset + 2] = onWhite(pixels[source + 2], alpha)
}

function encodeBmp(pixels: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  const stride = Math.ceil(width * 3 / 4) * 4
  const dataSize = stride * height
  const bytes = new Uint8Array(54 + dataSize)
  const view = new DataView(bytes.buffer)
  bytes.set([0x42, 0x4d])
  view.setUint32(2, bytes.length, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, dataSize, true)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * 4
      const target = 54 + (height - y - 1) * stride + x * 3
      const alpha = pixels[source + 3]
      bytes[target] = onWhite(pixels[source + 2], alpha)
      bytes[target + 1] = onWhite(pixels[source + 1], alpha)
      bytes[target + 2] = onWhite(pixels[source], alpha)
    }
  }
  return bytes
}

function encodeTiff(pixels: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  // Baseline, little-endian TIFF, one uncompressed RGB strip at 96 dpi.
  const entryCount = 13
  const bitsOffset = 8 + 2 + entryCount * 12 + 4
  const xResolutionOffset = bitsOffset + 6
  const yResolutionOffset = xResolutionOffset + 8
  const dataOffset = yResolutionOffset + 8
  const dataSize = width * height * 3
  const bytes = new Uint8Array(dataOffset + dataSize)
  const view = new DataView(bytes.buffer)
  bytes.set([0x49, 0x49])
  view.setUint16(2, 42, true)
  view.setUint32(4, 8, true)
  view.setUint16(8, entryCount, true)
  let entryOffset = 10
  const entry = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(entryOffset, tag, true)
    view.setUint16(entryOffset + 2, type, true)
    view.setUint32(entryOffset + 4, count, true)
    if (type === 3 && count === 1) view.setUint16(entryOffset + 8, value, true)
    else view.setUint32(entryOffset + 8, value, true)
    entryOffset += 12
  }
  entry(256, 4, 1, width)
  entry(257, 4, 1, height)
  entry(258, 3, 3, bitsOffset)
  entry(259, 3, 1, 1)
  entry(262, 3, 1, 2)
  entry(273, 4, 1, dataOffset)
  entry(277, 3, 1, 3)
  entry(278, 4, 1, height)
  entry(279, 4, 1, dataSize)
  entry(282, 5, 1, xResolutionOffset)
  entry(283, 5, 1, yResolutionOffset)
  entry(284, 3, 1, 1)
  entry(296, 3, 1, 2)
  view.setUint32(entryOffset, 0, true)
  for (let i = 0; i < 3; i++) view.setUint16(bitsOffset + i * 2, 8, true)
  view.setUint32(xResolutionOffset, 96, true)
  view.setUint32(xResolutionOffset + 4, 1, true)
  view.setUint32(yResolutionOffset, 96, true)
  view.setUint32(yResolutionOffset + 4, 1, true)
  for (let i = 0; i < width * height; i++) writeRgb(bytes, dataOffset + i * 3, pixels, i * 4)
  return bytes
}

function encodeGif(pixels: Uint8Array | Uint8ClampedArray, width: number, height: number) {
  // A fixed 3:3:2 palette and frequent LZW clears keep the stream simple and
  // deterministic. GIF is quantized to 256 colors; transparent pixels are white.
  const count = width * height
  const compressed = new Uint8Array(Math.ceil((count + Math.ceil(count / 200) + 2) * 9 / 8))
  let length = 0
  let bits = 0
  let bitCount = 0
  const code = (value: number) => {
    bits |= value << bitCount
    bitCount += 9
    while (bitCount >= 8) {
      compressed[length++] = bits & 255
      bits >>>= 8
      bitCount -= 8
    }
  }
  code(256)
  for (let i = 0; i < count; i++) {
    const source = i * 4
    const alpha = pixels[source + 3]
    const r = Math.round(onWhite(pixels[source], alpha) * 7 / 255)
    const g = Math.round(onWhite(pixels[source + 1], alpha) * 7 / 255)
    const b = Math.round(onWhite(pixels[source + 2], alpha) * 3 / 255)
    code((r << 5) | (g << 2) | b)
    if ((i + 1) % 200 === 0 && i + 1 < count) code(256)
  }
  code(257)
  if (bitCount) compressed[length++] = bits & 255

  const blockCount = Math.ceil(length / 255)
  const bytes = new Uint8Array(13 + 768 + 10 + 1 + length + blockCount + 2)
  const view = new DataView(bytes.buffer)
  bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  view.setUint16(6, width, true)
  view.setUint16(8, height, true)
  bytes[10] = 0xf7
  bytes[11] = 255
  for (let i = 0; i < 256; i++) {
    bytes[13 + i * 3] = Math.round((i >> 5) * 255 / 7)
    bytes[14 + i * 3] = Math.round(((i >> 2) & 7) * 255 / 7)
    bytes[15 + i * 3] = Math.round((i & 3) * 255 / 3)
  }
  let offset = 13 + 768
  bytes[offset++] = 0x2c
  offset += 4
  view.setUint16(offset, width, true)
  offset += 2
  view.setUint16(offset, height, true)
  offset += 2
  bytes[offset++] = 0
  bytes[offset++] = 8
  for (let i = 0; i < length; i += 255) {
    const size = Math.min(255, length - i)
    bytes[offset++] = size
    bytes.set(compressed.subarray(i, i + size), offset)
    offset += size
  }
  bytes[offset++] = 0
  bytes[offset] = 0x3b
  return bytes
}

/** Encode top-down RGBA pixels. The output is intentionally opaque white. */
export function encodeKetcherRasterPixels(
  pixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  format: Exclude<KetcherRasterFormat, 'jpeg'>,
): Uint8Array {
  validatePixels(pixels, width, height)
  switch (format) {
    case 'bmp': return encodeBmp(pixels, width, height)
    case 'tiff': return encodeTiff(pixels, width, height)
    case 'gif': return encodeGif(pixels, width, height)
    default: throw new Error('不支持的位图格式')
  }
}

/** Decode a rendered PNG or SVG, render it on white, and encode the requested format. */
export async function convertKetcherImageToRaster(imageBlob: Blob, format: KetcherRasterFormat | 'png'): Promise<Blob> {
  if (format !== 'png' && !isKetcherRasterFormat(format)) throw new Error('不支持的位图格式')
  const objectUrl = URL.createObjectURL(imageBlob)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('无法读取导出的图像'))
      element.src = objectUrl
    })
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (!width || !height || width > 65535 || height > 65535 || width * height > MAX_PIXELS) {
      throw new Error('位图尺寸无效，最大支持 1600 万像素')
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器不支持位图导出')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0)
    if (format === 'jpeg' || format === 'png') {
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
      const result = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, 0.95))
      if (!result || result.type !== mimeType) throw new Error(`当前浏览器无法编码 ${format.toUpperCase()}`)
      return result
    }
    const pixels = context.getImageData(0, 0, width, height).data
    const bytes = encodeKetcherRasterPixels(pixels, width, height, format)
    const info = KETCHER_RASTER_FORMATS.find(item => item.format === format)!
    return new Blob([new Uint8Array(bytes).buffer], { type: info.mimeType })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
