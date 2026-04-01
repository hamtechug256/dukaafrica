import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// POST /api/upload — Server-side signed Cloudinary upload
// Replaces client-side unsigned uploads for better security
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
        { error: 'Image upload not configured' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'dukaafrica/uploads'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Image must be less than 10MB' },
        { status: 400 }
      )
    }

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
    uploadFormData.append('transformation', 'q_auto,f_auto,w_1200,c_limit')

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: uploadFormData }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Cloudinary upload error:', errorData?.error?.message || 'Unknown error')
      return NextResponse.json(
        { error: 'Image upload failed' },
        { status: 500 }
      )
    }

    const result = await response.json()

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    })
  } catch (error) {
    console.error('Upload endpoint error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
