import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// POST /api/upload — Server-side signed Cloudinary upload
// Supports both images and PDF documents.
// Replaces client-side unsigned uploads for better security.
export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary server-side credentials not configured')
      return NextResponse.json(
        { error: 'Upload not configured' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'dukaafrica/uploads'
    const category = (formData.get('category') as string) || null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'

    if (!isImage && !isPdf) {
      return NextResponse.json(
        { error: 'Only image and PDF files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max for images, 25MB for PDFs)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024
    const MAX_PDF_SIZE = 25 * 1024 * 1024
    const maxSize = isPdf ? MAX_PDF_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File must be less than ${isPdf ? '25MB' : '10MB'}` },
        { status: 400 }
      )
    }

    // Determine resource type and upload URL
    const resourceType = isPdf ? 'raw' : 'image'
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`

    // Generate signature for signed upload
    const timestamp = Math.round(Date.now() / 1000)
    const signatureStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(signatureStr))
    const signature = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Upload to Cloudinary with signed parameters
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('api_key', apiKey)
    uploadFormData.append('timestamp', timestamp.toString())
    uploadFormData.append('signature', signature)
    uploadFormData.append('folder', folder)

    // Add image-specific transformations (not for PDFs)
    if (isImage) {
      uploadFormData.append('transformation', 'q_auto,f_auto,w_1200,c_limit')
    }

    // For PDFs, set the public_id to use the original filename (without extension)
    if (isPdf) {
      const originalName = file.name.replace(/\.[^/.]+$/, '')
      // Sanitize: replace spaces with underscores, remove special chars
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_')
      uploadFormData.append('public_id', sanitizedName)
      // Use raw upload type
      uploadFormData.append('resource_type', 'raw')
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadFormData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Cloudinary upload error:', errorData?.error?.message || 'Unknown error')
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      )
    }

    const result = await response.json()

    // Build response based on file type
    const responseData: Record<string, any> = {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      type: isPdf ? 'PDF' : 'IMAGE',
      category,
    }

    if (isImage) {
      responseData.width = result.width
      responseData.height = result.height
    }

    if (isPdf) {
      responseData.fileName = file.name
      responseData.resourceType = result.resource_type
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Upload endpoint error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
