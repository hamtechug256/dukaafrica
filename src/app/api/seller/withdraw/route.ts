/**
 * API: Request Withdrawal
 * 
 * POST /api/seller/withdraw
 * 
 * Processes seller withdrawal request to mobile money or bank
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { flutterwaveClient, generateTransactionReference } from '@/lib/flutterwave/client'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Minimum withdrawal amounts per currency
const MIN_WITHDRAWAL: Record<string, number> = {
  UGX: 10000,  // 10,000 UGX
  KES: 500,    // 500 KES
  TZS: 5000,   // 5,000 TZS
  RWF: 2000    // 2,000 RWF
}

// Bank codes for mobile money per country and provider
const MOBILE_MONEY_BANKS: Record<string, Record<string, string>> = {
  UGANDA: { MTN: 'MTNUG', AIRTEL: 'ATLUG' },
  KENYA: { MPESA: 'MPESA', AIRTEL: 'AIRTELMONEYKE' },
  TANZANIA: { VODACOM: 'VODATZ', MPESA: 'VODATZ', AIRTEL: 'AIRTELTZ', TIGO: 'TIGOTZ' },
  RWANDA: { MTN: 'MTNRW', AIRTEL: 'AIRTELRW' }
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

    // Get user and store
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { Store: true }
    })

    if (!user || !user.Store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const store = user.Store
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

    // Generate reference
    const reference = `WTH-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Determine account info
    let accountInfo = ''
    if (store.payoutMethod === 'MOBILE_MONEY') {
      accountInfo = store.payoutPhone || ''
    } else {
      accountInfo = `${store.payoutBankName || ''} - ${store.payoutBankAccount || ''}`
    }

    // Create payout record
    const payout = await prisma.sellerPayout.create({
      data: {
        storeId: store.id,
        amount,
        currency,
        status: 'PENDING',
        method: store.payoutMethod,
        accountInfo,
        reference
      }
    })

    // Deduct from available balance immediately (hold during processing)
    await prisma.store.update({
      where: { id: store.id },
      data: {
        availableBalance: { decrement: amount }
      }
    })

    // Try to process via Flutterwave
    try {
      // Determine bank code and account number
      let accountBank: string
      let accountNumber: string
      let narration: string

      if (store.payoutMethod === 'MOBILE_MONEY') {
        // Use the stored mobile provider, fallback to default
        const provider = store.payoutMobileProvider || 'MTN'
        const countryProviders = MOBILE_MONEY_BANKS[store.country] || MOBILE_MONEY_BANKS['UGANDA']
        accountBank = countryProviders[provider.toUpperCase()] || countryProviders['MTN'] || 'MTNUG'
        accountNumber = store.payoutPhone?.replace(/\D/g, '') || ''
        narration = `DuukaAfrica payout to ${store.payoutPhone}`
      } else if (store.payoutMethod === 'BANK_TRANSFER') {
        // Use the stored bank code
        accountBank = store.payoutBankCode || ''
        accountNumber = store.payoutBankAccount || ''
        narration = `DuukaAfrica payout to ${store.payoutBankName}`
      } else {
        throw new Error('Invalid payout method')
      }

      // Create transfer via Flutterwave
      const transferResponse = await flutterwaveClient.createTransfer({
        account_bank: accountBank,
        account_number: accountNumber,
        amount,
        currency,
        narration,
        reference,
        debit_currency: currency
      })

      if (transferResponse.status === 'success') {
        // Update payout status
        await prisma.sellerPayout.update({
          where: { id: payout.id },
          data: {
            status: 'PROCESSING'
          }
        })

        return NextResponse.json({
          success: true,
          message: 'Withdrawal initiated successfully. You will receive a confirmation shortly.',
          payout: {
            id: payout.id,
            amount,
            currency,
            status: 'PROCESSING',
            reference
          }
        })
      } else {
        throw new Error('Transfer failed')
      }

    } catch (transferError: any) {
      console.error('Flutterwave transfer error:', transferError)
      
      // Mark payout as failed
      await prisma.sellerPayout.update({
        where: { id: payout.id },
        data: { status: 'FAILED' }
      })

      // Restore balance
      await prisma.store.update({
        where: { id: store.id },
        data: {
          availableBalance: { increment: amount }
        }
      })

      return NextResponse.json(
        { error: 'Withdrawal processing failed. Please try again or contact support.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Withdrawal error:', error)
    return NextResponse.json(
      { error: 'Failed to process withdrawal' },
      { status: 500 }
    )
  }
}
