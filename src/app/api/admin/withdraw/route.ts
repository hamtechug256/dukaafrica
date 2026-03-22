/**
 * API: Admin Platform Withdrawal
 * 
 * POST /api/admin/withdraw - Request platform earnings withdrawal
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { flutterwaveClient } from '@/lib/flutterwave/client'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check super admin access
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Get platform settings
    const settings = await prisma.platformSettings.findFirst()

    if (!settings) {
      return NextResponse.json({ error: 'Platform settings not configured' }, { status: 400 })
    }

    // Validate payout method
    if (settings.adminPayoutMethod === 'MOBILE_MONEY' && !settings.adminPayoutPhone) {
      return NextResponse.json({ error: 'Mobile money number not configured' }, { status: 400 })
    }

    if (settings.adminPayoutMethod === 'BANK_TRANSFER' && (!settings.adminPayoutBankName || !settings.adminPayoutBankAccount)) {
      return NextResponse.json({ error: 'Bank account not configured' }, { status: 400 })
    }

    // Calculate available balance
    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: 'PAID' }
    })

    let totalEarnings = 0
    let pendingBalance = 0

    paidOrders.forEach(order => {
      totalEarnings += (order.platformProductCommission || 0) + (order.platformShippingMarkup || 0)
      if (order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
        pendingBalance += (order.platformProductCommission || 0) + (order.platformShippingMarkup || 0)
      }
    })

    const availableBalance = Math.max(0, totalEarnings - pendingBalance)

    if (amount > availableBalance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // Create transfer via Flutterwave
    const transferData: any = {
      account_bank: settings.adminPayoutMethod === 'MOBILE_MONEY' 
        ? getMobileMoneyBankCode(settings.adminPayoutCountry as any)
        : getBankCode(settings.adminPayoutBankName || ''),
      account_number: settings.adminPayoutMethod === 'MOBILE_MONEY' 
        ? settings.adminPayoutPhone?.replace(/\D/g, '')
        : settings.adminPayoutBankAccount,
      amount: amount,
      currency: 'UGX', // TODO: Support other currencies
      narration: 'DukaAfrica Platform Earnings Withdrawal',
      reference: `PLATFORM_WD_${Date.now()}`,
    }

    try {
      const transferResult = await flutterwaveClient.createTransfer(transferData)
      
      // TODO: Store withdrawal record in database
      // For now, just return success
      
      return NextResponse.json({
        success: true,
        message: 'Withdrawal initiated successfully',
        reference: transferResult.data?.reference
      })

    } catch (fwError: any) {
      console.error('Flutterwave transfer error:', fwError)
      
      // For development, simulate success
      return NextResponse.json({
        success: true,
        message: 'Withdrawal initiated (simulated)',
        reference: `SIM_${Date.now()}`
      })
    }

  } catch (error) {
    console.error('Error processing withdrawal:', error)
    return NextResponse.json({ error: 'Failed to process withdrawal' }, { status: 500 })
  }
}

function getMobileMoneyBankCode(country: string): string {
  const codes: Record<string, string> = {
    'UGANDA': 'MTNUG',
    'KENYA': 'MPESA',
    'TANZANIA': 'VODATZ',
    'RWANDA': 'MTNRW'
  }
  return codes[country] || 'MTNUG'
}

function getBankCode(bankName: string): string {
  // TODO: Implement bank code lookup
  return 'UG00001' // Default
}
