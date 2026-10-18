export interface VideoExportSettings {
  start: number
  end: number
  duration: number
  mute: boolean
}

const MAX_EDITABLE_VIDEO_BYTES = 80 * 1024 * 1024

export async function exportEditedVideo(
  file: File,
  settings: VideoExportSettings,
  onProgress: (progress: number) => void,
) {
  if (file.size > MAX_EDITABLE_VIDEO_BYTES) {
    throw new Error('This video is too large to edit on this device. Choose a clip under 80 MB or use the original.')
  }

  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
  } = await import('mediabunny')

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
  try {
    const videoTrack = await input.getPrimaryVideoTrack()
    if (!videoTrack) throw new Error('No editable video track was found in this file.')

    const target = new BufferTarget()
    const output = new Output({ format: new Mp4OutputFormat(), target })
    const trim: { start?: number; end?: number } = {}
    if (settings.start > 0.05) trim.start = settings.start
    if (settings.end < settings.duration - 0.05) trim.end = settings.end

    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      video: { width: Math.min(720, videoTrack.displayWidth), bitrate: 1_200_000 },
      trim: Object.keys(trim).length ? trim : undefined,
      audio: settings.mute ? { discard: true } : undefined,
      showWarnings: false,
    })

    if (!conversion.isValid) {
      throw new Error('This browser cannot export the selected video format. You can still use the original file.')
    }

    conversion.onProgress = progress => onProgress(Math.max(0, Math.min(1, progress)))
    await conversion.execute()
    if (!target.buffer) throw new Error('The edited video could not be created.')

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'nia-video'
    return new File([target.buffer], `${baseName}-edited.mp4`, {
      type: 'video/mp4',
      lastModified: Date.now(),
    })
  } finally {
    input.dispose()
  }
}
