import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { filterMessageContent } from '@/lib/message-filter'

// GET /api/chat/[id] - Get chat messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
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

    const participant = await prisma.chatParticipant.findFirst({
      where: {
        chatId: id,
        userId: user.id,
      },
    })

    if (!participant) {
      return NextResponse.json({ error: 'Not authorized for this chat' }, { status: 403 })
    }

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

    let product: {
      id: string;
      name: string;
      images: string | null;
      price: number;
      currency: string;
      slug: string;
    } | null = null
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
        },
      })
      if (productData) {
        product = {
          ...productData,
          price: productData.price instanceof Object && 'toNumber' in productData.price
            ? (productData.price as any).toNumber()
            : Number(productData.price),
        }
      }
    }

    await prisma.message.updateMany({
      where: {
        chatId: id,
        isRead: false,
        NOT: { userId: user.id },
      },
      data: { isRead: true },
    })

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
    const { userId } = await auth()
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

    const validTypes = ['TEXT', 'IMAGE', 'FILE', 'SYSTEM']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 })
    }

    if (content && content.length > 10000) {
      return NextResponse.json({ error: 'Message too long (max 10000 characters)' }, { status: 400 })
    }

    // Filter message content for contact info / off-platform attempts
    let safeContent = content || ''
    if (safeContent) {
      const filtered = filterMessageContent(safeContent)
      if (filtered.flagged) {
        console.warn(`[Chat] Message flagged for violations: ${filtered.violations.join(', ')} — chat=${id}, user=${user.id}`)
      }
      safeContent = filtered.clean
    }

    const message = await prisma.message.create({
      data: {
        chatId: id,
        userId: user.id,
        content: safeContent,
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
