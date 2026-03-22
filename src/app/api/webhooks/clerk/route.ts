import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/db'

// Webhook secret from Clerk Dashboard
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

// Super admin emails (comma-separated in ENV)
// These users will automatically be promoted to SUPER_ADMIN on signup
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses: Array<{
      email_address: string
      id: string
      verification: {
        status: string
      }
    }>
    phone_numbers?: Array<{
      phone_number: string
      id: string
    }>
    first_name: string | null
    last_name: string | null
    image_url: string | null
    unsafe_metadata?: {
      role?: string
      onboardingCompleted?: boolean
    }
    created_at: number
    updated_at: number
  }
}

export async function POST(req: Request) {
  // Check for webhook secret
  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // Validate headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    )
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: ClerkWebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 400 }
    )
  }

  const { id, email_addresses, phone_numbers, first_name, last_name, image_url, unsafe_metadata } = evt.data
  const email = email_addresses[0]?.email_address
  const phone = phone_numbers?.[0]?.phone_number
  
  // Determine role - Super admins are set via ENV variable
  let role = unsafe_metadata?.role || 'BUYER'
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email?.toLowerCase() || '')
  if (isSuperAdmin) {
    role = 'SUPER_ADMIN'
    console.log(`🔐 Super admin detected: ${email}`)
  }

  // Handle webhook events
  switch (evt.type) {
    case 'user.created':
      try {
        await prisma.user.create({
          data: {
            clerkId: id,
            email: email || '',
            phone: phone,
            firstName: first_name,
            lastName: last_name,
            name: [first_name, last_name].filter(Boolean).join(' ') || null,
            avatar: image_url,
            role: role as any,
            emailVerified: email_addresses[0]?.verification?.status === 'verified' 
              ? new Date() 
              : null,
          }
        })
        console.log(`✅ User created: ${id} with role: ${role}`)
      } catch (error) {
        console.error('Error creating user:', error)
        // User might already exist, try to update
        await prisma.user.upsert({
          where: { clerkId: id },
          create: {
            clerkId: id,
            email: email || '',
            phone: phone,
            firstName: first_name,
            lastName: last_name,
            name: [first_name, last_name].filter(Boolean).join(' ') || null,
            avatar: image_url,
            role: role as any,
          },
          update: {
            email: email,
            phone: phone,
            firstName: first_name,
            lastName: last_name,
            name: [first_name, last_name].filter(Boolean).join(' ') || null,
            avatar: image_url,
            // Always update role for super admins
            ...(isSuperAdmin && { role: 'SUPER_ADMIN' }),
          }
        })
      }
      break

    case 'user.updated':
      try {
        await prisma.user.update({
          where: { clerkId: id },
          data: {
            email: email,
            phone: phone,
            firstName: first_name,
            lastName: last_name,
            name: [first_name, last_name].filter(Boolean).join(' ') || null,
            avatar: image_url,
            // Always update role for super admins, otherwise keep existing or use metadata
            ...(isSuperAdmin ? { role: 'SUPER_ADMIN' } : { role: role as any }),
            emailVerified: email_addresses[0]?.verification?.status === 'verified' 
              ? new Date() 
              : null,
          }
        })
        console.log(`✅ User updated: ${id} with role: ${isSuperAdmin ? 'SUPER_ADMIN' : role}`)
      } catch (error) {
        console.error('Error updating user:', error)
      }
      break

    case 'user.deleted':
      try {
        await prisma.user.delete({
          where: { clerkId: id }
        })
        console.log(`✅ User deleted: ${id}`)
      } catch (error) {
        console.error('Error deleting user:', error)
      }
      break

    default:
      console.log(`Unhandled webhook event: ${evt.type}`)
  }

  return NextResponse.json({ success: true })
}
