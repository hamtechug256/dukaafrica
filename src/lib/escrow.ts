/**
 * Escrow Service
 * 
 * Handles the holding, release, and refund of buyer funds.
 * This is the core of buyer protection.
 */

import { prisma } from '@/lib/db'
import { getEscrowHoldDays, getCommissionRate } from './seller-tiers'
import { Prisma } from '@prisma/client'
import { evaluateAndPromoteStores } from './auto-tier'

// Escrow status types
export type EscrowStatus = 'HELD' | 'RELEASED' | 'REFUNDED' | 'PARTIAL_REFUND' | 'DISPUTED'

// Release types
export type ReleaseType = 'AUTO' | 'MANUAL' | 'BUYER_CONFIRMED' | 'DISPUTE_RESOLVED'

/**
 * Get or create platform reserve record
 */
async function getPlatformReserve(): Promise<{
  reservePercent: number
  record: any
}> {
  let reserve = await prisma.platformReserve.findFirst()
  
  if (!reserve) {
    // Create default platform reserve record
    reserve = await prisma.platformReserve.create({
      data: {
        totalReserve: 0,
        availableReserve: 0,
        pendingRefunds: 0,
        reservePercent: 10,
        minReserve: 500000,
        currency: 'UGX'
      }
    })
  }
  
  return {
    reservePercent: reserve.reservePercent.toNumber(),
    record: reserve
  }
}

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
  reserveAmount?: number
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
    const initialSellerAmount = params.grossAmount - platformAmount
    
    // Get platform reserve percentage
    const { reservePercent } = await getPlatformReserve()
    
    // Calculate reserve amount from seller's earnings
    const reserveAmount = Math.round(initialSellerAmount * (reservePercent / 100))
    
    // Final seller amount after reserve deduction
    const sellerAmount = initialSellerAmount - reserveAmount
    
    // Calculate release date
    const releaseDate = new Date()
    releaseDate.setDate(releaseDate.getDate() + holdDays)
    
    // Create escrow transaction and update reserves in a transaction
    const escrow = await prisma.$transaction(async (tx) => {
      // Create escrow transaction
      const newEscrow = await tx.escrowTransaction.create({
        data: {
          orderId: params.orderId,
          storeId: params.storeId,
          buyerId: params.buyerId,
          grossAmount: params.grossAmount,
          sellerAmount,
          platformAmount,
          reserveAmount,
          currency: params.currency,
          status: 'HELD',
          heldAt: new Date(),
        }
      })
      
      // Update platform reserve (increment both total and available)
      await tx.platformReserve.updateMany({
        data: {
          totalReserve: { increment: reserveAmount },
          availableReserve: { increment: reserveAmount }
        }
      })

      
      return newEscrow
    })
    
    // Update order + store escrow balance atomically
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: params.orderId },
        data: {
          escrowStatus: 'HELD',
          escrowHoldDays: holdDays,
          sellerProductEarnings: sellerAmount,
          platformProductCommission: platformAmount,
        }
      })
      
      await tx.store.update({
        where: { id: params.storeId },
        data: {
          escrowBalance: { increment: sellerAmount }
        }
      })
    })
    
    // FIX: Isolate notification — failure should not cause escrow to report failure
    // (prevents double-credit bug in callers that check escrowResult.success)
    try {
      const store = await prisma.store.findUnique({
        where: { id: params.storeId },
        select: { userId: true },
      })

      if (store) {
        await prisma.notification.create({
          data: {
            userId: store.userId,
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
      }
    } catch (notifError) {
      // Non-fatal: notification failure should not break escrow creation
      console.error('Failed to create escrow hold notification (non-fatal):', notifError)
    }
    
    return {
      success: true,
      escrowId: escrow.id,
      sellerAmount,
      platformAmount,
      reserveAmount,
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
 * For multi-vendor orders, releases all escrows for that order
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
    // Get all escrow transactions for this order (supports multi-vendor)
    const escrows = await prisma.escrowTransaction.findMany({
      where: { orderId: params.orderId, status: 'HELD' }
    })
    
    if (escrows.length === 0) {
      return { success: false, error: 'No held escrows found for this order' }
    }
    
    let totalReleased = 0
    
    // Release each escrow (one per store for multi-vendor orders)
    for (const escrow of escrows) {
      // FIX: Wrap escrow release + store balance update in a transaction for atomicity
      await prisma.$transaction(async (tx) => {
        // Update escrow status
        await tx.escrowTransaction.update({
          where: { id: escrow.id },
          data: {
            status: 'RELEASED',
            releaseType: params.releaseType,
            releasedAt: new Date(),
            releasedBy: params.releasedBy
          }
        })
        
        // Move from escrow balance to pending balance
        const sellerAmt = escrow.sellerAmount.toNumber()
        await tx.store.update({
          where: { id: escrow.storeId },
          data: {
            escrowBalance: { decrement: sellerAmt },
            pendingBalance: { increment: sellerAmt },
            successfulDeliveries: { increment: 1 },
            totalOrders: { increment: 1 }
          }
        })
      })
      
      // Update delivery success rate
      await updateDeliverySuccessRate(escrow.storeId)
      
      // FIX: Isolate notification creation — failure should not affect release
      try {
        const store = await prisma.store.findUnique({
          where: { id: escrow.storeId },
          select: { userId: true }
        })
        
        if (store) {
          const releasedSellerAmt = escrow.sellerAmount.toNumber()
          await prisma.notification.create({
            data: {
              userId: store.userId,
              type: 'ESCROW_RELEASED',
              title: 'Funds Released!',
              message: `${escrow.currency} ${releasedSellerAmt.toLocaleString()} has been released to your balance.`,
              data: JSON.stringify({
                orderId: params.orderId,
                amount: releasedSellerAmt
              })
            }
          })
        }
      } catch (notifError) {
        // Non-fatal: notification failure should not break escrow release
        console.error('Failed to create escrow release notification (non-fatal):', notifError)
      }
      
      totalReleased += escrow.sellerAmount.toNumber()
    }
    
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

    // Non-blocking: evaluate stores for auto-tier promotion after escrow release.
    // This runs in the background and won't slow down the main flow.
    // Errors are handled internally — one store's failure won't affect others.
    evaluateAndPromoteStores().catch((err) => {
      console.error('[ESCROW] Auto-tier evaluation failed (non-fatal):', err)
    })
    
    return {
      success: true,
      sellerAmount: totalReleased
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
 * For multi-vendor orders, refunds all escrows for that order
 */
export async function refundEscrow(params: {
  orderId: string
  refundReason: string
  refundedBy?: string
  refundAmount?: number // Partial refund if specified
  storeId?: string // Optional: refund only a specific store's escrow
}): Promise<{
  success: boolean
  refundAmount?: number
  error?: string
}> {
  try {
    // Get escrow transaction(s) - supports single store refund or full order refund
    const whereClause: any = { 
      orderId: params.orderId, 
      status: { in: ['HELD', 'DISPUTED'] }
    }
    if (params.storeId) {
      whereClause.storeId = params.storeId
    }
    
    const escrows = await prisma.escrowTransaction.findMany({
      where: whereClause
    })
    
    if (escrows.length === 0) {
      return { success: false, error: 'No held escrows found for this order' }
    }
    
    let totalRefunded = 0

    // Get order items for stock restoration
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: { OrderItem: true },
    })

    // Process each escrow within a transaction for atomicity
    for (const escrow of escrows) {
      const escrowSellerAmount = escrow.sellerAmount.toNumber()
      const isPartialRefund = params.refundAmount && params.refundAmount < escrowSellerAmount
      const refundAmount = params.refundAmount || escrowSellerAmount

      await prisma.$transaction(async (tx) => {
        // Update escrow status
        await tx.escrowTransaction.update({
          where: { id: escrow.id },
          data: {
            status: isPartialRefund ? 'PARTIAL_REFUND' : 'REFUNDED',
            refundAmount,
            refundReason: params.refundReason,
            refundedAt: new Date(),
            refundedBy: params.refundedBy
          }
        })

        // Deduct from store's escrow balance
        await tx.store.update({
          where: { id: escrow.storeId },
          data: {
            escrowBalance: { decrement: refundAmount },
            disputedOrders: { increment: 1 }
          }
        })

        // If partial refund, release remaining to seller
        if (isPartialRefund) {
          const remainingAmount = escrowSellerAmount - refundAmount
          await tx.store.update({
            where: { id: escrow.storeId },
            data: {
              pendingBalance: { increment: remainingAmount }
            }
          })
        }

        // Restore platform reserve
        const reserveAmount = escrow.reserveAmount?.toNumber() || 0
        const restoreReserve = isPartialRefund
          ? Math.round(reserveAmount * (refundAmount / escrowSellerAmount))
          : reserveAmount
        if (restoreReserve > 0) {
          await tx.platformReserve.updateMany({
            data: {
              totalReserve: { decrement: restoreReserve },
              availableReserve: { decrement: restoreReserve },
              pendingRefunds: { increment: restoreReserve }
            }
          })
        }
      })

      // Restore product stock for each order item
      if (order && order.OrderItem) {
        const orderItems = params.storeId
          ? order.OrderItem.filter(i => i.storeId === escrow.storeId)
          : order.OrderItem

        for (const item of orderItems) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } }
          })
        }
      }

      // Update delivery success rate
      await updateDeliverySuccessRate(escrow.storeId)

      totalRefunded += refundAmount
    }
    
    // Update order - only if all escrows are being refunded
    if (!params.storeId) {
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
    }
    
    // Get buyer for notification
    const buyerOrder = await prisma.order.findUnique({
      where: { id: params.orderId },
      select: { userId: true }
    })
    
    if (buyerOrder) {
      await prisma.notification.create({
        data: {
          userId: buyerOrder.userId,
          type: 'REFUND_PROCESSED',
          title: 'Refund Processed',
          message: `Your refund has been processed.`,
          data: JSON.stringify({
            orderId: params.orderId,
            amount: totalRefunded
          })
        }
      })
    }
    
    return {
      success: true,
      refundAmount: totalRefunded
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
  // Use groupBy to aggregate stats per status without loading all rows into memory
  const grouped = await prisma.escrowTransaction.groupBy({
    by: ['status'],
    _sum: {
      sellerAmount: true,
      platformAmount: true,
      reserveAmount: true,
      refundAmount: true,
    },
    _count: true,
  })

  let totalHeld = 0
  let totalReleased = 0
  let totalRefunded = 0
  let totalDisputed = 0
  let heldTransactions = 0

  for (const group of grouped) {
    const toNum = (val: unknown) =>
      val instanceof Prisma.Decimal ? val.toNumber() : typeof val === 'number' ? val : 0

    switch (group.status) {
      case 'HELD':
        totalHeld += toNum(group._sum.sellerAmount)
        heldTransactions += group._count
        break
      case 'RELEASED':
        totalReleased += toNum(group._sum.sellerAmount)
        break
      case 'REFUNDED':
      case 'PARTIAL_REFUND':
        totalRefunded += toNum(group._sum.refundAmount)
        break
      case 'DISPUTED':
        totalDisputed += toNum(group._sum.sellerAmount)
        break
    }
  }

  // Calculate actual average hold days from RELEASED transactions
  const releasedTxs = await prisma.escrowTransaction.findMany({
    where: {
      status: 'RELEASED',
      releasedAt: { not: null },
    },
    select: {
      heldAt: true,
      releasedAt: true,
    },
  })

  let avgHoldDays = 0
  if (releasedTxs.length > 0) {
    const totalDays = releasedTxs.reduce((sum, tx) => {
      const diffMs = tx.releasedAt!.getTime() - tx.heldAt.getTime()
      return sum + diffMs / (1000 * 60 * 60 * 24)
    }, 0)
    avgHoldDays = Math.round((totalDays / releasedTxs.length) * 10) / 10 // Round to 1 decimal
  }

  return {
    totalHeld,
    totalReleased,
    totalRefunded,
    totalDisputed,
    heldTransactions,
    avgHoldDays,
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
      totalHeld += tx.sellerAmount.toNumber()
    } else if (tx.status === 'RELEASED') {
      totalReleased += tx.sellerAmount.toNumber()
    }
  }

  return {
    transactions: transactions.map(tx => ({
      ...tx,
      amount: tx.amount?.toNumber() ?? null,
      grossAmount: tx.grossAmount?.toNumber() ?? null,
      sellerAmount: tx.sellerAmount.toNumber(),
      platformFee: tx.platformFee?.toNumber() ?? null,
      platformAmount: tx.platformAmount?.toNumber() ?? null,
      reserveAmount: tx.reserveAmount.toNumber(),
      refundAmount: tx.refundAmount?.toNumber() ?? null,
    })),
    totalHeld,
    totalReleased
  }
}
