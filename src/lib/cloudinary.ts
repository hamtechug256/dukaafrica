// Cloudinary Image Upload Utility
// Free tier: 25GB storage, 25GB/month bandwidth

interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  url: string
  width: number
  height: number
  format: string
  resource_type: string
  bytes: number
}

interface UploadOptions {
  folder?: string
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'auto' | 'jpg' | 'png' | 'webp'
}

// Upload image to Cloudinary
export async function uploadToCloudinary(
  file: File | Blob | string,
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult | null> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    console.error('Cloudinary configuration missing')
    return null
  }

  try {
    const formData = new FormData()
    
    // Handle different input types
    if (typeof file === 'string') {
      // Base64 or URL
      formData.append('file', file)
    } else {
      // File or Blob
      formData.append('file', file)
    }

    formData.append('upload_preset', uploadPreset)
    
    // Optional folder
    if (options.folder) {
      formData.append('folder', options.folder)
    }

    // Optional transformations
    const transformations: string[] = []
    
    if (options.maxWidth || options.maxHeight) {
      transformations.push(
        `w_${options.maxWidth || 'auto'},h_${options.maxHeight || 'auto'},c_limit`
      )
    }
    
    if (options.quality) {
      transformations.push(`q_${options.quality}`)
    }
    
    if (options.format) {
      transformations.push(`f_${options.format}`)
    }

    if (transformations.length > 0) {
      formData.append('transformation', transformations.join(','))
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Cloudinary upload error:', error)
      return null
    }

    const result = await response.json()
    return result as CloudinaryUploadResult
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

// Upload multiple images
export async function uploadMultipleImages(
  files: (File | Blob | string)[],
  options: UploadOptions = {}
): Promise<CloudinaryUploadResult[]> {
  const results: CloudinaryUploadResult[] = []

  for (const file of files) {
    const result = await uploadToCloudinary(file, options)
    if (result) {
      results.push(result)
    }
  }

  return results
}

// Delete image from Cloudinary
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Cloudinary configuration missing')
    return false
  }

  try {
    // Generate signature for authenticated request
    const timestamp = Math.round(Date.now() / 1000)
    const signature = await generateSignature(publicId, timestamp, apiSecret)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: apiKey,
          timestamp,
          signature,
        }),
      }
    )

    if (!response.ok) {
      return false
    }

    const result = await response.json()
    return result.result === 'ok'
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

// Generate signature for authenticated Cloudinary requests
async function generateSignature(
  publicId: string,
  timestamp: number,
  apiSecret: string
): Promise<string> {
  const message = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Get optimized image URL
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'auto' | 'jpg' | 'png' | 'webp'
    crop?: 'fill' | 'fit' | 'scale' | 'pad'
  } = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  
  if (!cloudName) {
    return ''
  }

  const transformations: string[] = []

  if (options.width || options.height) {
    const crop = options.crop || 'fill'
    transformations.push(
      `w_${options.width || 'auto'},h_${options.height || 'auto'},c_${crop}`
    )
  }

  if (options.quality) {
    transformations.push(`q_${options.quality}`)
  }

  if (options.format) {
    transformations.push(`f_${options.format}`)
  } else {
    transformations.push('f_auto') // Auto format by default
  }

  const transformationString = transformations.join(',')
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}/${publicId}`
}

// Client-side upload hook
export function useCloudinaryUpload() {
  const upload = async (
    file: File | Blob,
    options: UploadOptions = {}
  ): Promise<string | null> => {
    const result = await uploadToCloudinary(file, {
      folder: 'dukaafrica/products',
      maxWidth: 1200,
      quality: 80,
      format: 'webp',
      ...options,
    })
    
    return result?.secure_url || null
  }

  const uploadMultiple = async (
    files: File[],
    options: UploadOptions = {}
  ): Promise<string[]> => {
    const results = await uploadMultipleImages(files, {
      folder: 'dukaafrica/products',
      maxWidth: 1200,
      quality: 80,
      format: 'webp',
      ...options,
    })
    
    return results.map(r => r.secure_url)
  }

  return { upload, uploadMultiple }
}
