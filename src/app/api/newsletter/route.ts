/**
 * API: Newsletter Subscribe
 *
 * POST /api/newsletter
 * Subscribe an email to the newsletter using the existing NewsletterSubscriber model.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 },
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 },
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'You are already subscribed!',
      })
    }

    // Create subscriber
    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        source: 'footer',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! Welcome aboard.',
    })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({
        success: true,
        message: 'You are already subscribed!',
      })
    }
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}
