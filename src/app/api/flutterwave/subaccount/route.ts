/**
 * API: Create Flutterwave Subaccount for Seller
 * 
 * POST /api/flutterwave/subaccount
 * 
 * Creates a Flutterwave subaccount for a seller during onboarding
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import {
  flutterwaveClient,
  COUNTRY_TO_FW_COUNTRY,
} from '@/lib/flutterwave/client'
import { Country } from '@/types/enums'

// Bank codes for mobile money per country
const MOBILE_MONEY_BANKS: Record<Country, Array<{ code: string; name: string }>> = {
  UGANDA: [
    { code: 'MTNUG', name: 'MTN Mobile Money' },
    { code: 'AIRTELUG', name: 'Airtel Money Uganda' }
  ],
  KENYA: [
    { code: 'MPESA', name: 'M-Pesa' },
    { code: 'AIRTELKE', name: 'Airtel Money Kenya' }
  ],
  TANZANIA: [
    { code: 'VODATZ', name: 'M-Pesa Tanzania' },
    { code: 'AIRTELTZ', name: 'Airtel Money Tanzania' },
    { code: 'TIGOTZ', name: 'Tigo Pesa' }
  ],
  RWANDA: [
    { code: 'MTNRW', name: 'MTN Mobile Money Rwanda' },
    { code: 'AIRTELRW', name: 'Airtel Money Rwanda' }
  ],
  SOUTH_SUDAN: [
    { code: 'MTNSS', name: 'MTN Mobile Money South Sudan' },
    { code: 'ZAINSS', name: 'Zain Cash South Sudan' }
  ],
  BURUNDI: [
    { code: 'LUMITEL', name: 'Lumitel' },
    { code: 'ECOCASH', name: 'EcoCash Burundi' }
  ]
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

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { store: true }
    })

    if (!user || !user.store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      payoutMethod, // 'MOBILE_MONEY' or 'BANK_TRANSFER'
      phoneNumber,  // For mobile money
      bankCode,     // For bank transfer
      accountNumber,// For bank transfer
    } = body

    const store = user.store
    const country = store.country as Country

    // Prepare subaccount data
    let accountBank: string
    let accountNumberFinal: string

    if (payoutMethod === 'MOBILE_MONEY') {
      const mobileMoneyBanks = MOBILE_MONEY_BANKS[country]
      accountBank = mobileMoneyBanks[0].code
      accountNumberFinal = phoneNumber
    } else {
      if (!bankCode || !accountNumber) {
        return NextResponse.json(
          { error: 'Bank code and account number required for bank transfer' },
          { status: 400 }
        )
      }
      accountBank = bankCode
      accountNumberFinal = accountNumber
    }

    // Create Flutterwave subaccount
    const fwCountry = COUNTRY_TO_FW_COUNTRY[country]
    if (!fwCountry) {
      return NextResponse.json(
        { error: 'Country not supported for payouts' },
        { status: 400 }
      )
    }

    const subaccountResponse = await flutterwaveClient.createSubaccount({
      account_bank: accountBank,
      account_number: accountNumberFinal,
      business_name: store.businessName || store.name,
      business_email: store.email || user.email,
      business_contact: user.name || store.name,
      business_contact_mobile: phoneNumber || store.phone || '',
      business_mobile: phoneNumber || store.phone || '',
      country: fwCountry,
      split_type: 'flat',
      split_value: 0
    })

    if (subaccountResponse.status !== 'success') {
      throw new Error(subaccountResponse.message)
    }

    // Update store with subaccount info
    await prisma.store.update({
      where: { id: store.id },
      data: {
        flutterwaveSubaccountId: subaccountResponse.data.subaccount_id?.toString(),
        payoutMethod,
        payoutPhone: payoutMethod === 'MOBILE_MONEY' ? phoneNumber : null,
        payoutBankName: payoutMethod === 'BANK_TRANSFER' 
          ? subaccountResponse.data.bank_name 
          : null,
        payoutBankAccount: payoutMethod === 'BANK_TRANSFER' 
          ? accountNumberFinal 
          : null
      }
    })

    return NextResponse.json({
      success: true,
      subaccountId: subaccountResponse.data.subaccount_id,
      message: 'Payment account configured successfully'
    })

  } catch (error) {
    console.error('Subaccount creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment account' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { store: true }
    })

    if (!user || !user.store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    const store = user.store
    const country = store.country as Country

    const providers = MOBILE_MONEY_BANKS[country]

    return NextResponse.json({
      providers,
      currentSubaccount: store.flutterwaveSubaccountId,
      payoutMethod: store.payoutMethod,
      payoutPhone: store.payoutPhone,
      payoutBankName: store.payoutBankName,
      payoutBankAccount: store.payoutBankAccount ? '****' + store.payoutBankAccount.slice(-4) : null
    })

  } catch (error) {
    console.error('Error fetching subaccount info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subaccount info' },
      { status: 500 }
    )
  }
}
