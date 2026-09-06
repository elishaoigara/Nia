export type CropAspect = 'original' | 'square' | 'portrait' | 'story' | 'wide'

export interface ImageEditSettings {
  aspect: CropAspect
  rotation: 0 | 90 | 180 | 270
  flipHorizontal: boolean
  zoom: number
  focusX: number
  focusY: number
  brightness: number
  contrast: number
  saturation: number
}

export interface CropRectangle {
  x: number
  y: number
  width: number
  height: number
}

export const DEFAULT_IMAGE_EDIT_SETTINGS: ImageEditSettings = {
  aspect: 'original',
  rotation: 0,
  flipHorizontal: false,
  zoom: 1,
  focusX: 0.5,
  focusY: 0.5,
  brightness: 100,
  contrast: 100,
  saturation: 100,
}

export const ASPECT_RATIOS: Record<CropAspect, number | null> = {
  original: null,
  square: 1,
  portrait: 4 / 5,
  story: 9 / 16,
  wide: 16 / 9,
}

const MAX_WORKING_EDGE = 2560
const MAX_PREVIEW_WORKING_EDGE = 1280
const MAX_EXPORT_EDGE = 2048

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function computeCropRectangle(
  width: number,
  height: number,
  aspect: number | null,
  zoom: number,
  focusX: number,
  focusY: number,
): CropRectangle {
  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  const targetAspect = aspect && aspect > 0 ? aspect : safeWidth / safeHeight

  let cropWidth = safeWidth
  let cropHeight = cropWidth / targetAspect
  if (cropHeight > safeHeight) {
    cropHeight = safeHeight
    cropWidth = cropHeight * targetAspect
  }

  const safeZoom = clamp(zoom, 1, 3)
  cropWidth /= safeZoom
  cropHeight /= safeZoom

  const maxX = safeWidth - cropWidth
  const maxY = safeHeight - cropHeight

  return {
    x: maxX * clamp(focusX, 0, 1),
    y: maxY * clamp(focusY, 0, 1),
    width: cropWidth,
    height: cropHeight,
  }
}

function getWorkingDimensions(image: HTMLImageElement, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
  return {
    width: Math.max(1, Math.round(image.naturalWidth * scale)),
    height: Math.max(1, Math.round(image.naturalHeight * scale)),
  }
}

function createRotatedCanvas(image: HTMLImageElement, settings: ImageEditSettings, maxEdge = MAX_WORKING_EDGE) {
  const working = getWorkingDimensions(image, maxEdge)
  const swapsSides = settings.rotation === 90 || settings.rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = swapsSides ? working.height : working.width
  canvas.height = swapsSides ? working.width : working.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image editing is not supported in this browser.')

  context.save()
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((settings.rotation * Math.PI) / 180)
  context.scale(settings.flipHorizontal ? -1 : 1, 1)
  context.filter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%)`
  context.drawImage(image, -working.width / 2, -working.height / 2, working.width, working.height)
  context.restore()
  return canvas
}

export function drawEditedImagePreview(
  target: HTMLCanvasElement,
  image: HTMLImageElement,
  settings: ImageEditSettings,
  maxPreviewEdge = 900,
) {
  const rotated = createRotatedCanvas(image, settings, MAX_PREVIEW_WORKING_EDGE)
  const crop = computeCropRectangle(
    rotated.width,
    rotated.height,
    ASPECT_RATIOS[settings.aspect],
    settings.zoom,
    settings.focusX,
    settings.focusY,
  )
  const outputScale = Math.min(1, maxPreviewEdge / Math.max(crop.width, crop.height))
  target.width = Math.max(1, Math.round(crop.width * outputScale))
  target.height = Math.max(1, Math.round(crop.height * outputScale))
  const context = target.getContext('2d')
  if (!context) throw new Error('Image editing is not supported in this browser.')
  context.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, target.width, target.height)
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('The edited image could not be created.')),
      mimeType,
      quality,
    )
  })
}

function outputImageType(file: File) {
  if (file.type === 'image/png') return { mime: 'image/png', extension: 'png', quality: undefined }
  if (file.type === 'image/webp') return { mime: 'image/webp', extension: 'webp', quality: 0.9 }
  return { mime: 'image/jpeg', extension: 'jpg', quality: 0.9 }
}

export async function exportEditedImage(
  file: File,
  image: HTMLImageElement,
  settings: ImageEditSettings,
) {
  const rotated = createRotatedCanvas(image, settings)
  const crop = computeCropRectangle(
    rotated.width,
    rotated.height,
    ASPECT_RATIOS[settings.aspect],
    settings.zoom,
    settings.focusX,
    settings.focusY,
  )
  const outputScale = Math.min(1, MAX_EXPORT_EDGE / Math.max(crop.width, crop.height))
  const output = document.createElement('canvas')
  output.width = Math.max(1, Math.round(crop.width * outputScale))
  output.height = Math.max(1, Math.round(crop.height * outputScale))
  const context = output.getContext('2d')
  if (!context) throw new Error('Image editing is not supported in this browser.')
  context.drawImage(rotated, crop.x, crop.y, crop.width, crop.height, 0, 0, output.width, output.height)

  const format = outputImageType(file)
  const blob = await canvasToBlob(output, format.mime, format.quality)
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'nia-photo'
  return new File([blob], `${baseName}-edited.${format.extension}`, {
    type: format.mime,
    lastModified: Date.now(),
  })
}

export function formatMediaDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const wholeSeconds = Math.floor(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, '0')}`
}
