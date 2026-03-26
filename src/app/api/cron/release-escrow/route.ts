import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Cron Job API for Auto-Release of Escrow Funds
 * 
 * This endpoint is called by Vercel Cron or external cron service to automatically
 * release escrow funds when the holding period expires.
 * 
 * Security: Requires a secret parameter that matches the one stored in EscrowSettings
 * 
 * Usage:
 *   GET /api/cron/release-escrow?secret=YOUR_SECRET
 * 
 * Vercel Cron (vercel.json):
 *   {
 *     "crons": [{
 *       "path": "/api/cron/release-escrow?secret=YOUR_SECRET",
 *       "schedule": "0 0 * * *"
 *     }]
 *   }
 * 
 * External Cron (curl):
 *   curl "https://your-domain.com/api/cron/release-escrow?secret=YOUR_SECRET"
 */

export async function GET(request: NextRequest) {
  try {
    // Get secret from query parameter
    const { searchParams } = new URL(request.url)
    const providedSecret = searchParams.get('secret')

    // Fetch escrow settings
    const settings = await prisma.escrowSettings.findFirst()

    // Check if auto-release is enabled
    if (!settings?.autoReleaseEnabled) {
      return NextResponse.json({ 
        success: false,
        message: 'Auto-release is disabled',
        released: 0 
      })
    }

    // Validate secret
    if (!settings.autoReleaseCronSecret) {
      return NextResponse.json({ 
        success: false,
        error: 'Cron secret not configured. Generate one in admin settings.',
        released: 0 
      }, { status: 403 })
    }

    if (providedSecret !== settings.autoReleaseCronSecret) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid secret',
        released: 0 
      }, { status: 403 })
    }

    // Find escrow transactions ready for release
    const now = new Date()
    const readyTransactions = await prisma.escrowTransaction.findMany({
      where: {
        status: 'HELD',
        releaseAt: {
          lte: now
        }
      },
      include: {
        Store: true,
        Order: true
      }
    })

    if (readyTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No transactions ready for release',
        released: 0,
        checkedAt: now.toISOString()
      })
    }

    // Process each transaction
    const results = {
      released: 0,
      failed: 0,
      total: readyTransactions.length,
      details: [] as Array<{ id: string; status: string; amount?: number; error?: string }>
    }

    for (const tx of readyTransactions) {
      try {
        // Update transaction status
        await prisma.escrowTransaction.update({
          where: { id: tx.id },
          data: {
            status: 'RELEASED',
            releasedAt: now,
            autoReleased: true
          }
        })

        // Update store's available balance
        await prisma.store.update({
          where: { id: tx.storeId },
          data: {
            pendingBalance: {
              decrement: tx.sellerAmount
            },
            availableBalance: {
              increment: tx.sellerAmount
            }
          }
        })

        // Create notification for seller
        const storeOwner = await prisma.user.findFirst({
          where: { Store: { id: tx.storeId } }
        })

        if (storeOwner) {
          await prisma.notification.create({
            data: {
              userId: storeOwner.id,
              type: 'ESCROW_RELEASED',
              title: 'Escrow Funds Released',
              message: `${tx.currency} ${tx.sellerAmount.toLocaleString()} has been released to your available balance for order #${tx.Order?.orderNumber || tx.orderId.slice(0, 8)}`,
              data: JSON.stringify({ 
                escrowId: tx.id, 
                orderId: tx.orderId,
                amount: tx.sellerAmount 
              })
            }
          })
        }

        results.released++
        results.details.push({
          id: tx.id,
          status: 'released',
          amount: tx.sellerAmount
        })

      } catch (error) {
        console.error(`Failed to release transaction ${tx.id}:`, error)
        results.failed++
        results.details.push({
          id: tx.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Log the cron execution
    console.log(`[Cron] Escrow auto-release completed:`, {
      timestamp: now.toISOString(),
      total: results.total,
      released: results.released,
      failed: results.failed
    })

    return NextResponse.json({
      success: true,
      message: `Released ${results.released} of ${results.total} transactions`,
      ...results,
      checkedAt: now.toISOString()
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      released: 0
    }, { status: 500 })
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
