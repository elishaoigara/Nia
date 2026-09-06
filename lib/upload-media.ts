'use client'
import { Upload } from 'tus-js-client'
import { createClient } from '@/lib/supabase/client'
import { publicSupabaseEnv } from '@/lib/env'

export async function compressImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.8))
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp', lastModified: file.lastModified }) : file
  } finally { bitmap.close() }
}

export async function uploadMedia(bucket: string, file: File, onProgress?: (percent: number) => void) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  if (!user || !session) throw new Error('Sign in again to upload.')
  if (file.size > 30 * 1024 * 1024) throw new Error('Choose a file under 30 MB.')
  const prepared = await compressImage(file)
  // Persist the object name across retries. Successful uploads remove it, so
  // separate posts cannot accidentally share a mutable storage object.
  const fingerprint = `nia:upload:${user.id}:${bucket}:${file.name}:${file.size}:${file.lastModified}`
  let path = `${user.id}/${crypto.randomUUID()}.${prepared.name.split('.').pop() ?? 'bin'}`
  try { path = localStorage.getItem(fingerprint) ?? path; localStorage.setItem(fingerprint, path) } catch { /* optional resume persistence */ }
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(prepared, {
      endpoint: `${publicSupabaseEnv.url}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000],
      headers: { authorization: `Bearer ${session.access_token}`, apikey: publicSupabaseEnv.anonKey, 'x-upsert': 'false' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: { bucketName: bucket, objectName: path, contentType: prepared.type || 'application/octet-stream', cacheControl: '0' },
      fingerprint: async () => fingerprint,
      onProgress: (sent, total) => onProgress?.(Math.round(sent / total * 100)),
      onError: () => reject(new Error('Upload interrupted. Keep this file selected and retry to resume.')),
      onSuccess: () => resolve(),
    })
    void upload.findPreviousUploads().then(previous => {
      if (previous[0]) upload.resumeFromPreviousUpload(previous[0])
      upload.start()
    }).catch(reject)
  })
  try { localStorage.removeItem(fingerprint) } catch { /* optional */ }
  return { path, url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl }
}
