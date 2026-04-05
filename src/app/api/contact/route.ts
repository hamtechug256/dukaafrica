import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeText } from '@/lib/sanitize'

// POST /api/contact — Handle contact form submissions
export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 5 contact submissions per hour per IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rateLimit = await checkRateLimit('contact_form', ip, 5, 3600)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many messages. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { name, email, subject, orderNumber, message } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message must be under 5000 characters' }, { status: 400 })
    }

    // Store contact submission in database for admin dashboard access
    await prisma.contactSubmission.create({
      data: {
        name: sanitizeText(name.trim()),
        email: sanitizeText(email.trim().toLowerCase()),
        subject: sanitizeText(subject.trim()),
        orderNumber: orderNumber?.trim() || null,
        message: sanitizeText(message.trim()),
        status: 'NEW',
        ip: ip !== 'unknown' ? ip : null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for reaching out! We will get back to you within 24 hours.',
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    )
  }
}
