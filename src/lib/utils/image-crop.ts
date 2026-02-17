/**
 * Canvas-based image cropping utility for use with react-easy-crop.
 *
 * Takes an image source and a pixel crop area (from react-easy-crop's
 * onCropComplete callback) and returns a cropped Blob.
 */

export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Loads an image from a URL or object URL and returns an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

/**
 * Crops an image to the given pixel area and returns the result as a Blob.
 *
 * @param imageSrc - URL or object URL of the source image
 * @param pixelCrop - Crop area in pixels (from react-easy-crop)
 * @param outputType - MIME type for output (default: image/jpeg)
 * @param quality - Compression quality 0-1 (default: 0.85)
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputType: string = 'image/jpeg',
  quality: number = 0.85
): Promise<Blob> {
  const image = await loadImage(imageSrc)

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob returned null'))
      },
      outputType,
      quality
    )
  })
}
