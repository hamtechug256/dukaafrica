import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/chat - Get all chats for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all chats where user is a participant
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { userId: user.id },
        },
        isActive: true,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                NOT: { userId: user.id },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Get store info for product chats
    const chatsWithStore = await Promise.all(
      chats.map(async (chat) => {
        let product = null
        let store = null

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
              store: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          })
          store = product?.store
        }

        // Get other participant (the one we're chatting with)
        const otherParticipant = chat.participants.find((p) => p.userId !== user.id)

        return {
          ...chat,
          product,
          store,
          otherParticipant: otherParticipant?.user,
          unreadCount: chat._count.messages,
        }
      })
    )

    return NextResponse.json({ chats: chatsWithStore })
  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
  }
}

// POST /api/chat - Start a new chat
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { productId, orderId, recipientId, message } = body

    // Check if chat already exists
    const existingChat = await prisma.chat.findFirst({
      where: {
        OR: [
          { productId: productId || undefined },
          { orderId: orderId || undefined },
        ],
        participants: {
          every: {
            userId: { in: [user.id, recipientId] },
          },
        },
      },
      include: {
        participants: true,
      },
    })

    if (existingChat) {
      // Add message to existing chat
      const newMessage = await prisma.message.create({
        data: {
          chatId: existingChat.id,
          userId: user.id,
          content: message,
        },
      })

      await prisma.chat.update({
        where: { id: existingChat.id },
        data: { updatedAt: new Date() },
      })

      return NextResponse.json({ chat: existingChat, message: newMessage })
    }

    // Create new chat
    const chat = await prisma.chat.create({
      data: {
        productId: productId || undefined,
        orderId: orderId || undefined,
        participants: {
          create: [
            { userId: user.id },
            { userId: recipientId },
          ],
        },
        messages: message
          ? {
              create: {
                userId: user.id,
                content: message,
              },
            }
          : undefined,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: true,
      },
    })

    return NextResponse.json({ chat })
  } catch (error) {
    console.error('Error creating chat:', error)
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
  }
}
