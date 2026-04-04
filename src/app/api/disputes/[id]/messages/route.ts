/**
 * API: Add Dispute Message
 *
 * POST /api/disputes/[id]/messages
 *
 * Adds a message to a dispute thread.
 * - Both buyer and seller can add messages
 * - Supports file attachments
 * - Admins can also add messages
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sanitizeText } from '@/lib/sanitize'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true, firstName: true, lastName: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get dispute
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true,
        buyerRespondedAt: true,
        sellerRespondedAt: true,
      },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Check if dispute is still open
    if (dispute.status === 'RESOLVED') {
      return NextResponse.json({ error: 'Cannot add messages to a resolved dispute' }, { status: 400 })
    }

    // Check access - buyer, seller, or admin
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
    const isBuyer = dispute.buyerId === user.id
    const isSeller = dispute.sellerId === user.id

    if (!isAdmin && !isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse request body
    const body = await req.json()
    const { message, attachments, isInternal } = body

    // Validate message
    if (!message || message.trim().length < 5) {
      return NextResponse.json({
        error: 'Please provide a message (at least 5 characters)',
      }, { status: 400 })
    }

    // Sanitize message content to prevent stored XSS
    const sanitizedMessage = sanitizeText(message.trim())

    // Only admins can set isInternal
    const shouldBeInternal = isAdmin && isInternal

    // Create message
    const disputeMessage = await prisma.disputeMessage.create({
      data: {
        disputeId: id,
        userId: user.id,
        message: sanitizedMessage,
        attachments: attachments ? JSON.stringify(attachments) : null,
        isAdmin,
        isInternal: shouldBeInternal,
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: isAdmin,
            avatar: true,
            role: true,
          },
        },
      },
    })

    // Update response timestamps
    const updateData: any = {}

    if (isBuyer && !dispute.buyerRespondedAt) {
      updateData.buyerRespondedAt = new Date()
    }

    if (isSeller && !dispute.sellerRespondedAt) {
      updateData.sellerRespondedAt = new Date()
    }

    // Update dispute status to UNDER_REVIEW if first response
    if (dispute.status === 'OPEN') {
      updateData.status = 'UNDER_REVIEW'
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.dispute.update({
        where: { id },
        data: updateData,
      })
    }

    // Create notification for the other party
    if (!shouldBeInternal) {
      const notifyUserId = isBuyer ? dispute.sellerId : dispute.buyerId
      const senderName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.id === dispute.buyerId ? 'Buyer' : 'Seller'

      await prisma.notification.create({
        data: {
          userId: notifyUserId,
          type: 'DISPUTE_MESSAGE',
          title: 'New Message on Dispute',
          message: `${senderName} replied to the dispute: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
          data: JSON.stringify({
            disputeId: id,
            messageId: disputeMessage.id,
          }),
        },
      })

      // Notify admins if not admin sending
      if (!isAdmin) {
        const admins = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true },
        })

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'DISPUTE_MESSAGE',
              title: 'New Message on Dispute',
              message: `${isAdmin ? 'Admin' : (isBuyer ? 'Buyer' : 'Seller')} replied to dispute #${id.slice(0, 8)}`,
              data: JSON.stringify({
                disputeId: id,
                messageId: disputeMessage.id,
              }),
            },
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        ...disputeMessage,
        attachments: disputeMessage.attachments ? JSON.parse(disputeMessage.attachments) : null,
      },
    })
  } catch (error) {
    console.error('Error adding dispute message:', error)
    return NextResponse.json({ error: 'Failed to add message' }, { status: 500 })
  }
}

/**
 * GET /api/disputes/[id]/messages
 *
 * Get all messages for a dispute
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true, firstName: true, lastName: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get dispute
    const dispute = await prisma.dispute.findUnique({
      where: { id },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
      },
    })

    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 })
    }

    // Check access
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
    const isBuyer = dispute.buyerId === user.id
    const isSeller = dispute.sellerId === user.id

    if (!isAdmin && !isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get messages
    // Non-admins can't see internal messages
    const messages = await prisma.disputeMessage.findMany({
      where: {
        disputeId: id,
        ...(isAdmin ? {} : { isInternal: false }),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: isAdmin,
            avatar: true,
            role: true,
          },
        },
      },
    })

    // Parse attachments
    const parsedMessages = messages.map((msg) => ({
      ...msg,
      attachments: msg.attachments ? JSON.parse(msg.attachments) : null,
    }))

    return NextResponse.json({
      messages: parsedMessages,
    })
  } catch (error) {
    console.error('Error fetching dispute messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
