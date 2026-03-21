import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/chat/[id] - Get chat messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatId: id,
        userId: user.id,
      },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Not authorized for this chat' }, { status: 403 })
    }

    // Get chat with messages
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        ChatParticipant: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
                Store: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        Message: {
          orderBy: { createdAt: 'asc' },
          include: {
            User: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Get product info if exists
    let product: {
      id: string;
      name: string;
      images: string | null;
      price: number;
      currency: string;
      slug: string;
    } | null = null
    if (chat.productId) {
      product = await prisma.product.findUnique({
        where: { id: chat.productId },
        select: {
          id: true,
          name: true,
          images: true,
          price: true,
          currency: true,
          slug: true,
        },
      })
    }

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        chatId: id,
        isRead: false,
        NOT: { userId: user.id },
      },
      data: { isRead: true },
    })

    // Update participant's last read
    await prisma.chatParticipant.update({
      where: { id: participant.id },
      data: { lastRead: new Date() },
    })

    const otherParticipant = chat.ChatParticipant.find((p) => p.userId !== user.id)

    return NextResponse.json({
      chat,
      product,
      otherParticipant: otherParticipant?.User,
    })
  } catch (error) {
    console.error('Error fetching chat:', error)
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 })
  }
}

// POST /api/chat/[id] - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is participant
    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatId: id,
        userId: user.id,
      },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Not authorized for this chat' }, { status: 403 })
    }

    const body = await request.json()
    const { content, type = 'TEXT', fileUrl } = body

    if (!content && !fileUrl) {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 })
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        chatId: id,
        userId: user.id,
        content: content || '',
        type,
        fileUrl,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    // Update chat timestamp
    await prisma.chat.update({
      where: { id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
