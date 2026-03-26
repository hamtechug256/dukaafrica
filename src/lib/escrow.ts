/**
 * Escrow Service
 * 
 * Handles the holding, release, and refund of buyer funds.
 * This is the core of buyer protection.
 */

import { prisma } from '@/lib/db'
import { getEscrowHoldDays, getCommissionRate } from './seller-tiers'

// Escrow status types
export type EscrowStatus = 'HELD' | 'RELEASED' | 'REFUNDED' | 'PARTIAL_REFUND' | 'DISPUTED'

// Release types
export type ReleaseType = 'AUTO' | 'MANUAL' | 'BUYER_CONFIRMED' | 'DISPUTE_RESOLVED'

/**
 * Create escrow hold for an order
 * Called when payment is successful
 */
export async function createEscrowHold(params: {
  orderId: string
  storeId: string
  buyerId: string
  grossAmount: number
  currency: string
  store: {
    verificationTier: string
    verificationStatus: string
    commissionRate?: number
  }
}): Promise<{
  success: boolean
  escrowId?: string
  sellerAmount?: number
  platformAmount?: number
  holdDays?: number
  releaseDate?: Date
  error?: string
}> {
  try {
    // Get commission rate and hold days based on seller tier
    const commissionRate = params.store.commissionRate || await getCommissionRate(params.store)
    const holdDays = await getEscrowHoldDays(params.store)
    
    // Calculate amounts
    const platformAmount = Math.round(params.grossAmount * (commissionRate / 100))
    const sellerAmount = params.grossAmount - platformAmount
    
    // Calculate release date
    const releaseDate = new Date()
    releaseDate.setDate(releaseDate.getDate() + holdDays)
    
    // Create escrow transaction
    const escrow = await prisma.escrowTransaction.create({
      data: {
        orderId: params.orderId,
        storeId: params.storeId,
        buyerId: params.buyerId,
        grossAmount: params.grossAmount,
        sellerAmount,
        platformAmount,
        currency: params.currency,
        status: 'HELD',
        heldAt: new Date(),
      }
    })
    
    // Update order with escrow info
    await prisma.order.update({
      where: { id: params.orderId },
      data: {
        escrowStatus: 'HELD',
        escrowHoldDays: holdDays,
        sellerProductEarnings: sellerAmount,
        platformProductCommission: platformAmount,
      }
    })
    
    // Add to store's escrow balance
    await prisma.store.update({
      where: { id: params.storeId },
      data: {
        escrowBalance: { increment: sellerAmount }
      }
    })
    
    // Create notification for seller
    await prisma.notification.create({
      data: {
        userId: params.storeId, // This should be store owner's user ID
        type: 'ESCROW_HELD',
        title: 'Payment Received - Funds in Escrow',
        message: `Order payment of ${params.currency} ${params.grossAmount.toLocaleString()} received. Funds will be released in ${holdDays} days after delivery confirmation.`,
        data: JSON.stringify({
          orderId: params.orderId,
          amount: sellerAmount,
          releaseDate: releaseDate.toISOString()
        })
      }
    })
    
    return {
      success: true,
      escrowId: escrow.id,
      sellerAmount,
      platformAmount,
      holdDays,
      releaseDate
    }
  } catch (error) {
    console.error('Error creating escrow hold:', error)
    return {
      success: false,
      error: 'Failed to create escrow hold'
    }
  }
}

/**
 * Release escrow funds to seller
 * Called when buyer confirms delivery or auto-release
 */
export async function releaseEscrow(params: {
  orderId: string
  releaseType: ReleaseType
  releasedBy?: string // Admin ID if manual release
}): Promise<{
  success: boolean
  sellerAmount?: number
  error?: string
}> {
  try {
    // Get escrow transaction
    const escrow = await prisma.escrowTransaction.findFirst({
      where: { orderId: params.orderId, status: 'HELD' }
    })
    
    if (!escrow) {
      return { success: false, error: 'Escrow not found or already released' }
    }
    
    // Update escrow status
    await prisma.escrowTransaction.update({
      where: { id: escrow.id },
      data: {
        status: 'RELEASED',
        releaseType: params.releaseType,
        releasedAt: new Date(),
        releasedBy: params.releasedBy
      }
    })
    
    // Update order
    await prisma.order.update({
      where: { id: params.orderId },
      data: {
        escrowStatus: 'RELEASED',
        escrowReleasedAt: new Date(),
        status: 'DELIVERED',
        deliveredAt: new Date()
      }
    })
    
    // Move from escrow balance to pending balance
    await prisma.store.update({
      where: { id: escrow.storeId },
      data: {
        escrowBalance: { decrement: escrow.sellerAmount },
        pendingBalance: { increment: escrow.sellerAmount }
      }
    })
    
    // Update store performance metrics
    await prisma.store.update({
      where: { id: escrow.storeId },
      data: {
        successfulDeliveries: { increment: 1 },
        totalOrders: { increment: 1 }
      }
    })
    
    // Update delivery success rate
    await updateDeliverySuccessRate(escrow.storeId)
    
    // Create notification for seller
    const store = await prisma.store.findUnique({
      where: { id: escrow.storeId },
      select: { userId: true }
    })
    
    if (store) {
      await prisma.notification.create({
        data: {
          userId: store.userId,
          type: 'ESCROW_RELEASED',
          title: 'Funds Released!',
          message: `${escrow.currency} ${escrow.sellerAmount.toLocaleString()} has been released to your balance.`,
          data: JSON.stringify({
            orderId: params.orderId,
            amount: escrow.sellerAmount
          })
        }
      })
    }
    
    return {
      success: true,
      sellerAmount: escrow.sellerAmount
    }
  } catch (error) {
    console.error('Error releasing escrow:', error)
    return {
      success: false,
      error: 'Failed to release escrow'
    }
  }
}

/**
 * Refund escrow to buyer
 */
export async function refundEscrow(params: {
  orderId: string
  refundReason: string
  refundedBy?: string
  refundAmount?: number // Partial refund if specified
}): Promise<{
  success: boolean
  refundAmount?: number
  error?: string
}> {
  try {
    // Get escrow transaction
    const escrow = await prisma.escrowTransaction.findFirst({
      where: { 
        orderId: params.orderId, 
        status: { in: ['HELD', 'DISPUTED'] }
      }
    })
    
    if (!escrow) {
      return { success: false, error: 'Escrow not found or already processed' }
    }
    
    const isPartialRefund = params.refundAmount && params.refundAmount < escrow.sellerAmount
    const refundAmount = params.refundAmount || escrow.sellerAmount
    
    // Update escrow
    await prisma.escrowTransaction.update({
      where: { id: escrow.id },
      data: {
        status: isPartialRefund ? 'PARTIAL_REFUND' : 'REFUNDED',
        refundAmount,
        refundReason: params.refundReason,
        refundedAt: new Date(),
        refundedBy: params.refundedBy
      }
    })
    
    // Update order
    await prisma.order.update({
      where: { id: params.orderId },
      data: {
        escrowStatus: 'REFUNDED',
        escrowRefundedAt: new Date(),
        status: 'CANCELLED',
        cancellationReason: params.refundReason,
        cancelledAt: new Date()
      }
    })
    
    // Deduct from store's escrow balance
    await prisma.store.update({
      where: { id: escrow.storeId },
      data: {
        escrowBalance: { decrement: refundAmount }
      }
    })
    
    // If partial refund, release remaining to seller
    if (isPartialRefund) {
      const remainingAmount = escrow.sellerAmount - refundAmount
      await prisma.store.update({
        where: { id: escrow.storeId },
        data: {
          pendingBalance: { increment: remainingAmount }
        }
      })
    }
    
    // Update store disputed orders count
    await prisma.store.update({
      where: { id: escrow.storeId },
      data: {
        disputedOrders: { increment: 1 },
        totalOrders: { increment: 1 }
      }
    })
    
    // Update delivery success rate
    await updateDeliverySuccessRate(escrow.storeId)
    
    // Get buyer for notification
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      select: { userId: true }
    })
    
    if (order) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: 'REFUND_PROCESSED',
          title: 'Refund Processed',
          message: `Your refund of ${escrow.currency} ${refundAmount.toLocaleString()} has been processed.`,
          data: JSON.stringify({
            orderId: params.orderId,
            amount: refundAmount
          })
        }
      })
    }
    
    return {
      success: true,
      refundAmount
    }
  } catch (error) {
    console.error('Error refunding escrow:', error)
    return {
      success: false,
      error: 'Failed to process refund'
    }
  }
}

/**
 * Mark escrow as disputed
 */
export async function disputeEscrow(params: {
  orderId: string
  reason: string
}): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const escrow = await prisma.escrowTransaction.findFirst({
      where: { orderId: params.orderId, status: 'HELD' }
    })
    
    if (!escrow) {
      return { success: false, error: 'Escrow not found' }
    }
    
    // Update escrow status
    await prisma.escrowTransaction.update({
      where: { id: escrow.id },
      data: { status: 'DISPUTED' }
    })
    
    // Update order
    await prisma.order.update({
      where: { id: params.orderId },
      data: { escrowStatus: 'DISPUTED' }
    })
    
    return { success: true }
  } catch (error) {
    console.error('Error disputing escrow:', error)
    return { success: false, error: 'Failed to dispute escrow' }
  }
}

/**
 * Auto-release escrows that have passed their hold period
 * Should be called by a cron job
 */
export async function autoReleaseEscrows(): Promise<{
  released: number
  errors: string[]
}> {
  const errors: string[] = []
  let released = 0
  
  try {
    // Find orders that are:
    // 1. Payment status PAID
    // 2. Escrow status HELD
    // 3. Created + holdDays days ago
    // 4. Not disputed
    
    const ordersToRelease = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        escrowStatus: 'HELD',
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
        createdAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Default 7 days
        }
      },
      include: {
        Store: true,
        EscrowTransaction: true
      }
    })
    
    for (const order of ordersToRelease) {
      // Check if hold period has passed based on seller tier
      const holdDays = order.escrowHoldDays || 7
      const releaseDate = new Date(order.createdAt)
      releaseDate.setDate(releaseDate.getDate() + holdDays)
      
      if (new Date() >= releaseDate) {
        const result = await releaseEscrow({
          orderId: order.id,
          releaseType: 'AUTO'
        })
        
        if (result.success) {
          released++
          
          // Update order with auto-release timestamp
          await prisma.order.update({
            where: { id: order.id },
            data: { autoReleasedAt: new Date() }
          })
        } else {
          errors.push(`Order ${order.orderNumber}: ${result.error}`)
        }
      }
    }
    
    return { released, errors }
  } catch (error) {
    console.error('Error in auto-release:', error)
    return { released, errors: ['System error during auto-release'] }
  }
}

/**
 * Update delivery success rate for a store
 */
async function updateDeliverySuccessRate(storeId: string): Promise<void> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { totalOrders: true, successfulDeliveries: true }
  })
  
  if (store && store.totalOrders > 0) {
    const successRate = (store.successfulDeliveries / store.totalOrders) * 100
    
    await prisma.store.update({
      where: { id: storeId },
      data: { deliverySuccessRate: successRate }
    })
  }
}

/**
 * Get escrow summary for admin dashboard
 */
export async function getEscrowSummary(): Promise<{
  totalHeld: number
  totalReleased: number
  totalRefunded: number
  totalDisputed: number
  heldTransactions: number
  avgHoldDays: number
}> {
  const transactions = await prisma.escrowTransaction.findMany()
  
  let totalHeld = 0
  let totalReleased = 0
  let totalRefunded = 0
  let totalDisputed = 0
  let heldTransactions = 0
  
  for (const tx of transactions) {
    switch (tx.status) {
      case 'HELD':
        totalHeld += tx.sellerAmount
        heldTransactions++
        break
      case 'RELEASED':
        totalReleased += tx.sellerAmount
        break
      case 'REFUNDED':
      case 'PARTIAL_REFUND':
        totalRefunded += tx.refundAmount || 0
        break
      case 'DISPUTED':
        totalDisputed += tx.sellerAmount
        break
    }
  }
  
  return {
    totalHeld,
    totalReleased,
    totalRefunded,
    totalDisputed,
    heldTransactions,
    avgHoldDays: 5 // Could calculate from actual data
  }
}

/**
 * Get escrow transactions for a store
 */
export async function getStoreEscrowTransactions(storeId: string, limit = 20): Promise<{
  transactions: any[]
  totalHeld: number
  totalReleased: number
}> {
  const transactions = await prisma.escrowTransaction.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      Order: {
        select: {
          orderNumber: true,
          status: true
        }
      }
    }
  })
  
  let totalHeld = 0
  let totalReleased = 0
  
  for (const tx of transactions) {
    if (tx.status === 'HELD' || tx.status === 'DISPUTED') {
      totalHeld += tx.sellerAmount
    } else if (tx.status === 'RELEASED') {
      totalReleased += tx.sellerAmount
    }
  }
  
  return { transactions, totalHeld, totalReleased }
}
