/**
 * API: Seller Store Settings
 *
 * GET /api/seller/settings - Get seller's store settings
 * PUT /api/seller/settings - Update seller's store settings
 *
 * Handles:
 * - Store profile
 * - Shipping preferences (local only vs cross-border)
 * - Countries seller ships to
 * - Payout settings (Mobile Money, Bank Transfer)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
// Country is a string type in our Prisma schema

// GET - Retrieve seller's store settings
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and their store - use explicit select for backward compatibility
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        email: true,
        currency: true,
        Store: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logo: true,
            banner: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            region: true,
            country: true,
            isVerified: true,
            commissionRate: true,
            availableBalance: true,
            pendingBalance: true,
            shipsToCountries: true,
            flutterwaveSubaccountId: true,
            payoutMethod: true,
            payoutPhone: true,
            payoutMobileProvider: true,
            payoutBankName: true,
            payoutBankCode: true,
            payoutBankAccount: true,
          }
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.Store) {
      return NextResponse.json({ error: 'Store not found', needsOnboarding: true }, { status: 404 })
    }

    const store = user.Store

    // Parse ships to countries
    let shipsToCountries: string[] = []
    if (store.shipsToCountries) {
      try {
        shipsToCountries = JSON.parse(store.shipsToCountries)
      } catch (e) {
        shipsToCountries = []
      }
    }

    const settings = {
      store: {
        id: store.id,
        name: store.name,
        slug: store.slug,
        description: store.description,
        logo: store.logo,
        banner: store.banner,
        phone: store.phone,
        email: store.email,
        address: store.address,
        city: store.city,
        region: store.region,
        country: store.country,
        isVerified: store.isVerified,
        commissionRate: store.commissionRate,
      },
      shipping: {
        localShippingOnly: false, // Will be computed from products
        shipsToCountries,
        defaultWeightUnit: 'kg',
      },
      payout: {
        method: store.payoutMethod || '',
        phone: store.payoutPhone || '',
        mobileProvider: store.payoutMobileProvider || '',
        bankName: store.payoutBankName || '',
        bankCode: store.payoutBankCode || '',
        bankAccount: store.payoutBankAccount || '',
      },
      flutterwave: {
        subaccountId: store.flutterwaveSubaccountId || '',
        isConfigured: !!store.flutterwaveSubaccountId,
      },
      balances: {
        available: store.availableBalance,
        pending: store.pendingBalance,
        currency: user.currency,
      },
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error fetching seller settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT - Update seller's store settings
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and their store - use explicit select for backward compatibility
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        email: true,
        Store: {
          select: {
            id: true,
            name: true,
            email: true,
            country: true,
            flutterwaveSubaccountId: true,
          }
        },
      },
    })

    if (!user || !user.Store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const body = await request.json()
    const { section, data } = body

    switch (section) {
      case 'store':
        // Update store profile
        await prisma.store.update({
          where: { id: user.Store.id },
          data: {
            name: data.name,
            description: data.description,
            phone: data.phone,
            email: data.email,
            address: data.address,
            city: data.city,
            region: data.region,
          },
        })
        break

      case 'shipping':
        // Update shipping preferences
        await prisma.store.update({
          where: { id: user.Store.id },
          data: {
            // Store which countries this seller ships to
            shipsToCountries: JSON.stringify(data.shipsToCountries),
          },
        })
        break

      case 'payout':
        // Update payout settings
        const payoutData: any = {
          payoutMethod: data.method,
          payoutPhone: data.phone || null,
          payoutMobileProvider: data.mobileProvider || null,
          payoutBankName: data.bankName || null,
          payoutBankCode: data.bankCode || null,
          payoutBankAccount: data.bankAccount || null,
        }

        // Create Flutterwave subaccount if not exists
        if (!user.Store.flutterwaveSubaccountId && data.method) {
          try {
            const { createSellerSubaccount } = await import('@/lib/flutterwave/client')
            const subaccount = await createSellerSubaccount({
              storeId: user.Store.id,
              storeName: user.Store.name,
              email: user.Store.email || user.email,
              country: user.Store.country,
              payoutMethod: data.method,
              payoutPhone: data.phone,
              bankName: data.bankName,
              bankAccount: data.bankAccount,
            })
            
            if (subaccount) {
              payoutData.flutterwaveSubaccountId = subaccount.subaccount_id
            }
          } catch (error) {
            console.error('Error creating Flutterwave subaccount:', error)
            // Continue without subaccount - can be created later
          }
        }

        await prisma.store.update({
          where: { id: user.Store.id },
          data: payoutData,
        })
        break

      case 'logo':
        // Update store logo
        await prisma.store.update({
          where: { id: user.Store.id },
          data: { logo: data.logo },
        })
        break

      case 'banner':
        // Update store banner
        await prisma.store.update({
          where: { id: user.Store.id },
          data: { banner: data.banner },
        })
        break

      case 'images':
        // Update store images (logo and banner)
        await prisma.store.update({
          where: { id: user.Store.id },
          data: {
            logo: data.logo || null,
            banner: data.banner || null,
          },
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Settings updated' })
  } catch (error) {
    console.error('Error updating seller settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
