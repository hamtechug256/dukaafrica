/**
 * API: Request Withdrawal
 * 
 * POST /api/seller/withdraw
 * 
 * Processes seller withdrawal request to mobile money or bank.
 * Uses manual payouts — the payout is created as PENDING and an admin
 * processes it manually. Balance is deducted at request time so there
 * is no double-deduction bug.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Minimum withdrawal amounts per currency
const MIN_WITHDRAWAL: Record<string, number> = {
  UGX: 10000,  // 10,000 UGX
  KES: 500,    // 500 KES
  TZS: 5000,   // 5,000 TZS
  RWF: 2000    // 2,000 RWF
}

// Currency per country
const COUNTRY_CURRENCY: Record<string, string> = {
  UGANDA: 'UGX',
  KENYA: 'KES',
  TANZANIA: 'TZS',
  RWANDA: 'RWF'
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting: 3 withdrawal attempts per minute per user
    const rateLimit = await checkRateLimit('seller_withdraw', userId, RATE_LIMITS.WITHDRAW.maxRequests, RATE_LIMITS.WITHDRAW.windowSeconds)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many withdrawal attempts. Please try again later.', retryAfter: rateLimit.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) } }
      )
    }

    const body = await request.json()
    const { amount } = body

    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid withdrawal amount' },
        { status: 400 }
      )
    }

    // Get user and store (must be active)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId, isActive: true },
      include: { Store: true }
    })

    if (!user || !user.Store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const store = user.Store

    // Ensure store is active
    if (!store.isActive) {
      return NextResponse.json(
        { error: 'Your store is not active. Please contact support.' },
        { status: 403 }
      )
    }

    const currency = COUNTRY_CURRENCY[store.country] || 'UGX'

    // Check minimum withdrawal
    const minWithdrawal = MIN_WITHDRAWAL[currency] || 1000
    if (amount < minWithdrawal) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${minWithdrawal.toLocaleString()} ${currency}` },
        { status: 400 }
      )
    }

    // Check available balance (convert Decimal to number for comparison)
    const storeAvailableBalance = store.availableBalance.toNumber()
    if (storeAvailableBalance < amount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Check payout method is configured
    if (!store.payoutMethod) {
      return NextResponse.json(
        { error: 'Please configure your payout method in settings first' },
        { status: 400 }
      )
    }

    // Capture verified payout method
    const payoutMethod = store.payoutMethod

    // Generate reference
    const reference = `WTH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Determine account info
    let accountInfo = ''
    if (store.payoutMethod === 'MOBILE_MONEY') {
      accountInfo = store.payoutPhone || ''
    } else {
      accountInfo = `${store.payoutBankName || ''} - ${store.payoutBankAccount || ''}`
    }

    // ATOMIC: Check balance + create payout + deduct in a single transaction
    // Balance is deducted ONCE here. When admin marks payout as COMPLETED,
    // no further balance change happens (manual payout model).
    let payout: any
    try {
      payout = await prisma.$transaction(async (tx) => {
        // Re-check balance inside transaction to prevent double-withdrawal
        const freshStore = await tx.store.findUnique({
          where: { id: store.id },
          select: { availableBalance: true }
        })
        const freshBalance = freshStore!.availableBalance.toNumber()
        if (freshBalance < amount) {
          throw new Error('Insufficient balance')
        }

        // Create payout record (PENDING — admin will process manually)
        const newPayout = await tx.sellerPayout.create({
          data: {
            storeId: store.id,
            amount,
            currency,
            status: 'PENDING',
            method: payoutMethod,
            accountInfo,
            reference
          }
        })

        // Deduct balance atomically (only once — at request time)
        await tx.store.update({
          where: { id: store.id },
          data: { availableBalance: { decrement: amount } }
        })

        return newPayout
      })
    } catch (txError: any) {
      if (txError.message?.includes('Insufficient balance')) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
      }
      throw txError
    }

    return NextResponse.json({
      success: true,
      message: 'Withdrawal requested. The admin will process it within 24 hours.',
      payout: {
        id: payout.id,
        amount,
        currency,
        status: 'PENDING',
        method: payoutMethod,
        accountInfo,
        reference,
        createdAt: payout.createdAt
      }
    })

  } catch (error) {
    console.error('Withdrawal error:', error)
    return NextResponse.json(
      { error: 'Failed to process withdrawal' },
      { status: 500 }
    )
  }
}
