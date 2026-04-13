import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Rate limit: max 5 subscriptions per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }

  record.count++
  return true
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}

// POST /api/newsletter
export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many subscription attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse body — support both JSON and form data
    let email = ''

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      email = body.email?.trim()
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      email = (formData.get('email') as string)?.trim()
    } else {
      // Try JSON first, then form data
      try {
        const body = await request.json()
        email = body.email?.trim()
      } catch {
        const formData = await request.formData()
        email = (formData.get('email') as string)?.trim()
      }
    }

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Please provide your email address.' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    })

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json({
          success: true,
          message: "You're already subscribed! Thank you for your interest.",
        })
      } else {
        // Reactivate
        await prisma.newsletterSubscriber.update({
          where: { email },
          data: { isActive: true },
        })
        return NextResponse.json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.',
        })
      }
    }

    // Create new subscriber
    await prisma.newsletterSubscriber.create({
      data: {
        email,
        isActive: true,
        source: 'FOOTER',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! Check your inbox for exciting updates.',
    })
  } catch (error) {
    console.error('[NEWSLETTER SUBSCRIBE ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// GET /api/newsletter (health check / subscriber count for admin)
export async function GET() {
  try {
    const total = await prisma.newsletterSubscriber.count()
    const active = await prisma.newsletterSubscriber.count({
      where: { isActive: true },
    })

    return NextResponse.json({
      total,
      active,
    })
  } catch {
    return NextResponse.json({ total: 0, active: 0 })
  }
}
