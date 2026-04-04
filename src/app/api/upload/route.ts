import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// POST /api/upload — Server-side signed Cloudinary upload
// Supports images, PDFs, and document files (DOC, DOCX, XLSX).
// Replaces client-side unsigned uploads for better security.

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xlsx', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

function getFileCategory(mimeType: string, fileName: string): 'image' | 'document' {
  if (mimeType.startsWith('image/')) return 'image'
  const ext = '.' + fileName.split('.').pop()?.toLowerCase()
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'image'
  return 'document'
}

function getDisplayType(mimeType: string, fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'PDF'
  if (ext === 'doc' || mimeType === 'application/msword') return 'DOC'
  if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'DOCX'
  if (ext === 'xlsx' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'XLSX'
  if (mimeType.startsWith('image/')) return 'IMAGE'
  return ext.toUpperCase()
}

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

    const fileCategory = getFileCategory(file.type, file.name)

    // Validate file type by MIME or extension fallback
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '')
    if (!ALLOWED_MIME_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: images, PDF, DOC, DOCX, XLSX' },
        { status: 400 }
      )
    }

    // Validate file size (10MB for images, 25MB for documents)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024
    const MAX_DOC_SIZE = 25 * 1024 * 1024
    const maxSize = fileCategory === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File must be less than ${fileCategory === 'image' ? '10MB' : '25MB'}` },
        { status: 400 }
      )
    }

    // Determine resource type and upload URL
    const resourceType = fileCategory === 'image' ? 'image' : 'raw'
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

    // Add image-specific transformations (not for documents)
    if (fileCategory === 'image') {
      uploadFormData.append('transformation', 'q_auto,f_auto,w_1200,c_limit')
    }

    // For documents, set the public_id to use the original filename (without extension)
    if (fileCategory === 'document') {
      const originalName = file.name.replace(/\.[^/.]+$/, '')
      // Sanitize: replace spaces with underscores, remove special chars
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_')
      uploadFormData.append('public_id', sanitizedName)
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
    const displayType = getDisplayType(file.type, file.name)

    // Build response
    const responseData: Record<string, unknown> = {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      type: displayType,
      fileName: file.name,
      category,
    }

    if (fileCategory === 'image') {
      responseData.width = result.width
      responseData.height = result.height
    }

    if (fileCategory === 'document') {
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
