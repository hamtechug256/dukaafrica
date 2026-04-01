import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// GET /api/chat - Get all chats for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const chats = await prisma.chat.findMany({
      where: {
        ChatParticipant: {
          some: { userId: user.id },
        },
        isActive: true,
      },
      include: {
        ChatParticipant: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
          },
        },
        Message: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            User: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
        _count: {
          select: {
            Message: {
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

    const chatsWithStore = await Promise.all(
      chats.map(async (chat) => {
        let product: {
          id: string;
          name: string;
          images: string | null;
          price: number;
          currency: string;
          slug: string;
          Store: { id: string; name: string; slug: string };
        } | null = null
        let store: { id: string; name: string; slug: string } | null = null

        if (chat.productId) {
          const productData = await prisma.product.findUnique({
            where: { id: chat.productId },
            select: {
              id: true,
              name: true,
              images: true,
              price: true,
              currency: true,
              slug: true,
              Store: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          })
          if (productData) {
            product = {
              ...productData,
              price: productData.price instanceof Object && 'toNumber' in productData.price
                ? (productData.price as any).toNumber()
                : Number(productData.price),
              Store: productData.Store,
            }
          }
          store = productData?.Store ?? null
        }

        const otherParticipant = chat.ChatParticipant.find((p) => p.userId !== user.id)

        return {
          ...chat,
          product,
          store,
          otherParticipant: otherParticipant?.User,
          unreadCount: chat._count.Message,
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
    const { userId } = await auth()
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

    // M3 FIX: Input validation
    if (!recipientId) {
      return NextResponse.json({ error: 'recipientId is required' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'message is required and must be non-empty' }, { status: 400 })
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: 'message is too long (max 5000 characters)' }, { status: 400 })
    }
    if (recipientId === user.id) {
      return NextResponse.json({ error: 'Cannot start a chat with yourself' }, { status: 400 })
    }

    const recipientExists = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    })
    if (!recipientExists) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    const existingChat = await prisma.chat.findFirst({
      where: {
        OR: [
          { productId: productId || undefined },
          { orderId: orderId || undefined },
        ],
        ChatParticipant: {
          every: {
            userId: { in: [user.id, recipientId] },
          },
        },
      },
      include: {
        ChatParticipant: true,
      },
    })

    if (existingChat) {
      const newMessage = await prisma.message.create({
        data: {
          chatId: existingChat.id,
          userId: user.id,
          content: message.trim(),
        },
      })

      await prisma.chat.update({
        where: { id: existingChat.id },
        data: { updatedAt: new Date() },
      })

      return NextResponse.json({ chat: existingChat, message: newMessage })
    }

    const chat = await prisma.chat.create({
      data: {
        productId: productId || undefined,
        orderId: orderId || undefined,
        ChatParticipant: {
          create: [
            { userId: user.id },
            { userId: recipientId },
          ],
        },
        Message: {
          create: {
            userId: user.id,
            content: message.trim(),
          },
        },
      },
      include: {
        ChatParticipant: {
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
        Message: true,
      },
    })

    return NextResponse.json({ chat })
  } catch (error) {
    console.error('Error creating chat:', error)
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
  }
}
