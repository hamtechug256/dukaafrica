/**
 * Cron Job: Auto-Release Escrows
 * 
 * This endpoint should be called by Vercel Cron Jobs or external cron service.
 * It releases escrow funds that have passed their hold period.
 * 
 * Vercel Cron configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/release-escrows",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { releaseEscrow } from '@/lib/escrow'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  if (!cronSecret) {
    console.warn('CRON_SECRET not set - cron jobs may be insecure')
    return true // Allow in development
  }
  
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[CRON] Starting escrow auto-release job...')
    
    const results = {
      released: 0,
      errors: [] as string[],
      totalProcessed: 0,
      releasedAmount: 0,
    }

    // Find orders eligible for auto-release
    // Conditions:
    // 1. Payment status is PAID
    // 2. Escrow status is HELD
    // 3. Order is not cancelled or disputed
    // 4. Hold period has passed (createdAt + escrowHoldDays < now)
    // 5. Order has been shipped (status = SHIPPED or OUT_FOR_DELIVERY or DELIVERED)
    
    const now = new Date()
    
    const eligibleOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        escrowStatus: 'HELD',
        status: { in: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'] },
      },
      include: {
        Store: {
          select: {
            verificationTier: true,
            verificationStatus: true,
          }
        },
        Dispute: true,
      }
    })

    console.log(`[CRON] Found ${eligibleOrders.length} orders to check`)

    for (const order of eligibleOrders) {
      try {
        // Skip if disputed
        if (order.Dispute) {
          continue
        }
        
        results.totalProcessed++
        
        // Calculate if hold period has passed
        const holdDays = order.escrowHoldDays || 7
        const releaseDate = new Date(order.createdAt)
        releaseDate.setDate(releaseDate.getDate() + holdDays)
        
        if (now < releaseDate) {
          // Hold period not yet passed
          continue
        }

        // Check if shipped at least X days ago (buyer had time to report issues)
        const minDeliveryBuffer = 2 // days after shipping
        if (order.shippedAt) {
          const bufferDate = new Date(order.shippedAt)
          bufferDate.setDate(bufferDate.getDate() + minDeliveryBuffer)
          if (now < bufferDate) {
            continue
          }
        }

        // Release the escrow
        const result = await releaseEscrow({
          orderId: order.id,
          releaseType: 'AUTO',
        })

        if (result.success) {
          results.released++
          results.releasedAmount += result.sellerAmount || 0
          
          // Update order with auto-release timestamp
          await prisma.order.update({
            where: { id: order.id },
            data: { 
              autoReleasedAt: now,
              status: 'DELIVERED',
              deliveredAt: order.deliveredAt || now,
            }
          })
          
          console.log(`[CRON] Released escrow for order ${order.orderNumber}`)
        } else {
          results.errors.push(`Order ${order.orderNumber}: ${result.error}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Order ${order.orderNumber}: ${errorMsg}`)
        console.error(`[CRON] Error processing order ${order.orderNumber}:`, error)
      }
    }

    // Log completion
    console.log(`[CRON] Auto-release complete. Released: ${results.released}, Errors: ${results.errors.length}`)

    // Create a log entry
    if (results.released > 0 || results.errors.length > 0) {
      await prisma.securityLog.create({
        data: {
          type: 'CRON_ESCROW_RELEASE',
          identifier: 'system',
          details: JSON.stringify(results),
        }
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      ...results,
    })
  } catch (error) {
    console.error('[CRON] Fatal error in escrow release job:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering
export const POST = GET
