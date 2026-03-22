import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const SubscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validate input
    const validationResult = SubscribeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid email address', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existing) {
      // If unsubscribed, reactivate
      if (!existing.isActive) {
        await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { isActive: true }
        })
        return NextResponse.json({ 
          message: 'Welcome back! You have been resubscribed.',
          resubscribed: true 
        })
      }
      
      return NextResponse.json({ 
        message: 'You are already subscribed to our newsletter.',
        alreadySubscribed: true 
      })
    }

    // Create new subscriber
    await prisma.newsletterSubscriber.create({
      data: {
        email: email.toLowerCase(),
        source: 'FOOTER',
        isActive: true,
      }
    })

    return NextResponse.json({ 
      message: 'Thank you for subscribing! Check your inbox for a confirmation.',
      success: true 
    })

  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again later.' },
      { status: 500 }
    )
  }
}
