import { PrismaClient, NotificationType } from '@prisma/client'

const prisma = new PrismaClient()

interface CreateNotificationData {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
}

export async function createNotification(data: CreateNotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data ? JSON.stringify(data.data) : null,
      },
    })
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

// Helper functions for common notifications
export const notifications = {
  orderPlaced: (userId: string, orderNumber: string, total: number) =>
    createNotification({
      userId,
      type: 'ORDER_PLACED',
      title: 'Order Placed',
      message: `Your order ${orderNumber} for UGX ${total.toLocaleString()} has been placed successfully.`,
      data: { orderNumber },
    }),

  orderConfirmed: (userId: string, orderNumber: string) =>
    createNotification({
      userId,
      type: 'ORDER_CONFIRMED',
      title: 'Order Confirmed',
      message: `Your order ${orderNumber} has been confirmed by the seller.`,
      data: { orderNumber },
    }),

  orderShipped: (userId: string, orderNumber: string, busCompany?: string) =>
    createNotification({
      userId,
      type: 'ORDER_SHIPPED',
      title: 'Order Shipped',
      message: `Your order ${orderNumber} has been shipped${busCompany ? ` via ${busCompany}` : ''}.`,
      data: { orderNumber, busCompany },
    }),

  orderDelivered: (userId: string, orderNumber: string) =>
    createNotification({
      userId,
      type: 'ORDER_DELIVERED',
      title: 'Order Delivered',
      message: `Your order ${orderNumber} has been delivered. Please leave a review!`,
      data: { orderNumber },
    }),

  orderCancelled: (userId: string, orderNumber: string, reason?: string) =>
    createNotification({
      userId,
      type: 'ORDER_CANCELLED',
      title: 'Order Cancelled',
      message: `Your order ${orderNumber} has been cancelled${reason ? `: ${reason}` : ''}.`,
      data: { orderNumber, reason },
    }),

  paymentReceived: (userId: string, orderNumber: string, amount: number) =>
    createNotification({
      userId,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `Payment of UGX ${amount.toLocaleString()} for order ${orderNumber} has been confirmed.`,
      data: { orderNumber, amount },
    }),

  newMessage: (userId: string, senderName: string) =>
    createNotification({
      userId,
      type: 'NEW_MESSAGE',
      title: 'New Message',
      message: `You have a new message from ${senderName}.`,
      data: { senderName },
    }),

  priceDrop: (userId: string, productName: string, oldPrice: number, newPrice: number) =>
    createNotification({
      userId,
      type: 'PRICE_DROP',
      title: 'Price Drop Alert',
      message: `${productName} price dropped from UGX ${oldPrice.toLocaleString()} to UGX ${newPrice.toLocaleString()}!`,
      data: { productName, oldPrice, newPrice },
    }),

  backInStock: (userId: string, productName: string) =>
    createNotification({
      userId,
      type: 'BACK_IN_STOCK',
      title: 'Back in Stock',
      message: `${productName} is back in stock!`,
      data: { productName },
    }),

  reviewRequest: (userId: string, productName: string, orderNumber: string) =>
    createNotification({
      userId,
      type: 'REVIEW_REQUEST',
      title: 'Leave a Review',
      message: `How was your experience with ${productName}? Leave a review!`,
      data: { productName, orderNumber },
    }),
}
