/**
 * Client-side image compression utility.
 *
 * Resizes images to a maximum dimension while preserving aspect ratio,
 * and re-encodes as JPEG for consistent output format and smaller file sizes.
 *
 * Uses the Canvas API (createImageBitmap + canvas.toBlob) -- no external
 * library needed. ~15 lines of core logic.
 *
 * Default: max 800px on longest side, JPEG quality 0.8.
 * This produces good visual quality for poll option thumbnails (~200px card)
 * and teacher views (~400px) while keeping files under ~200KB.
 */
export async function compressImage(
  file: File,
  maxDimension: number = 800,
  quality: number = 0.8
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  // Calculate proportional dimensions
  let newWidth = width
  let newHeight = height
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height)
    newWidth = Math.round(width * ratio)
    newHeight = Math.round(height * ratio)
  }

  // Draw to canvas at target size
  const canvas = document.createElement('canvas')
  canvas.width = newWidth
  canvas.height = newHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)
  bitmap.close()

  // Encode as JPEG
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
  )

  // Return as File with .jpg extension
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
  })
}
