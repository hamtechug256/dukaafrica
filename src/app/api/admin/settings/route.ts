/**
 * API: Admin Platform Settings
 *
 * GET /api/admin/settings - Get all platform settings
 * PUT /api/admin/settings - Update platform settings
 *
 * Handles:
 * - Commission rates
 * - Shipping rates per zone
 * - Flutterwave configuration
 * - Exchange rates
 * - General platform settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { Currency, ShippingZoneType } from '@/types/enums'

// Default settings structure
const DEFAULT_SETTINGS = {
  commission: {
    defaultRate: 10,
    shippingMarkupPercent: 5,
    categoryRates: {} as Record<string, number>,
  },
  flutterwave: {
    publicKey: '',
    secretKey: '',
    encryptionKey: '',
    webhookSecret: '',
    testMode: true,
  },
  exchangeRates: {
    UGX_TO_KES: 0.035,
    UGX_TO_TZS: 0.27,
    UGX_TO_RWF: 0.26,
    KES_TO_UGX: 28.5,
    KES_TO_TZS: 7.7,
    KES_TO_RWF: 7.5,
    TZS_TO_UGX: 3.7,
    TZS_TO_KES: 0.13,
    TZS_TO_RWF: 0.97,
    RWF_TO_UGX: 3.85,
    RWF_TO_KES: 0.13,
    RWF_TO_TZS: 1.03,
    lastUpdated: new Date().toISOString(),
  },
  general: {
    platformName: 'DuukaAfrica',
    supportEmail: 'support@duukaafrica.com',
    supportPhone: '',
    defaultCountry: 'UGANDA',
    defaultCurrency: 'UGX',
    maintenanceMode: false,
  },
}

// GET - Retrieve all settings
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get platform settings from DB
    const platformSettings = await prisma.platformSettings.findFirst()

    // Get shipping rates from DB
    const shippingRates = await prisma.shippingRate.findMany({
      where: { isActive: true },
      include: { ShippingTier: true },
      orderBy: { zoneType: 'asc' },
    })

    // Get shipping tiers
    const shippingTiers = await prisma.shippingTier.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    })

    // Get shipping zone matrix
    const zoneMatrix = await prisma.shippingZoneMatrix.findMany({
      where: { isActive: true },
    })

    // Format zone matrix for easy lookup
    const formattedZoneMatrix: Record<string, Record<string, string>> = {}
    zoneMatrix.forEach((z) => {
      if (!formattedZoneMatrix[z.originCountry]) {
        formattedZoneMatrix[z.originCountry] = {}
      }
      formattedZoneMatrix[z.originCountry][z.destCountry] = z.zoneType
    })

    // Build response
    const settings = {
      commission: {
        defaultRate: platformSettings?.defaultCommissionRate ?? DEFAULT_SETTINGS.commission.defaultRate,
        shippingMarkupPercent: platformSettings?.shippingMarkupPercent ?? DEFAULT_SETTINGS.commission.shippingMarkupPercent,
      },
      flutterwave: {
        publicKey: platformSettings?.flutterwavePublicKey ?? '',
        secretKey: platformSettings?.flutterwaveSecretKey ? '••••••••' : '',
        encryptionKey: platformSettings?.flutterwaveEncryptionKey ? '••••••••' : '',
        webhookSecret: platformSettings?.flutterwaveWebhookSecret ? '••••••••' : '',
        testMode: !platformSettings?.flutterwaveSecretKey?.startsWith('FLWSECK_PROD'),
      },
      exchangeRates: platformSettings?.exchangeRates
        ? JSON.parse(platformSettings.exchangeRates)
        : DEFAULT_SETTINGS.exchangeRates,
      general: {
        platformName: 'DuukaAfrica',
        supportEmail: 'support@duukaafrica.com',
        defaultCountry: platformSettings?.adminPayoutCountry ?? 'UGANDA',
        defaultCurrency: 'UGX',
      },
      shipping: {
        rates: shippingRates.map((r) => ({
          id: r.id,
          zoneType: r.zoneType,
          tierId: r.tierId,
          tierName: r.ShippingTier?.name,
          baseFee: r.baseFee,
          perKgFee: r.perKgFee,
          crossBorderFee: r.crossBorderFee,
          currency: r.currency,
          platformMarkupPercent: r.platformMarkupPercent,
        })),
        tiers: shippingTiers.map((t) => ({
          id: t.id,
          name: t.name,
          minWeight: t.minWeight,
          maxWeight: t.maxWeight,
          description: t.description,
        })),
        zoneMatrix: formattedZoneMatrix,
      },
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { section, data } = body

    // Get or create platform settings
    let platformSettings = await prisma.platformSettings.findFirst()

    if (!platformSettings) {
      platformSettings = await prisma.platformSettings.create({
        data: {
          defaultCommissionRate: DEFAULT_SETTINGS.commission.defaultRate,
          shippingMarkupPercent: DEFAULT_SETTINGS.commission.shippingMarkupPercent,
        },
      })
    }

    // Update based on section
    switch (section) {
      case 'commission':
        await prisma.platformSettings.update({
          where: { id: platformSettings.id },
          data: {
            defaultCommissionRate: data.defaultRate,
            shippingMarkupPercent: data.shippingMarkupPercent,
          },
        })
        break

      case 'flutterwave':
        const fwData: any = {}
        if (data.publicKey) fwData.flutterwavePublicKey = data.publicKey
        if (data.secretKey && !data.secretKey.includes('•')) fwData.flutterwaveSecretKey = data.secretKey
        if (data.encryptionKey && !data.encryptionKey.includes('•')) fwData.flutterwaveEncryptionKey = data.encryptionKey
        if (data.webhookSecret && !data.webhookSecret.includes('•')) fwData.flutterwaveWebhookSecret = data.webhookSecret

        await prisma.platformSettings.update({
          where: { id: platformSettings.id },
          data: fwData,
        })
        break

      case 'exchangeRates':
        await prisma.platformSettings.update({
          where: { id: platformSettings.id },
          data: {
            exchangeRates: JSON.stringify({
              ...data,
              lastUpdated: new Date().toISOString(),
            }),
            exchangeRatesUpdatedAt: new Date(),
          },
        })
        break

      case 'shipping':
        // Handle shipping rates update
        if (data.rates) {
          for (const rate of data.rates) {
            if (rate.id) {
              await prisma.shippingRate.update({
                where: { id: rate.id },
                data: {
                  baseFee: rate.baseFee,
                  perKgFee: rate.perKgFee,
                  crossBorderFee: rate.crossBorderFee,
                  platformMarkupPercent: rate.platformMarkupPercent,
                },
              })
            } else {
              await prisma.shippingRate.create({
                data: {
                  zoneType: rate.zoneType as ShippingZoneType,
                  baseFee: rate.baseFee,
                  perKgFee: rate.perKgFee,
                  crossBorderFee: rate.crossBorderFee || 0,
                  currency: rate.currency as Currency || 'UGX',
                  platformMarkupPercent: rate.platformMarkupPercent || 5,
                  tierId: rate.tierId,
                },
              })
            }
          }
        }

        // Handle zone matrix update
        if (data.zoneMatrix) {
          for (const [origin, destinations] of Object.entries(data.zoneMatrix)) {
            for (const [dest, zoneType] of Object.entries(destinations as Record<string, string>)) {
              await prisma.shippingZoneMatrix.upsert({
                where: {
                  originCountry_destCountry: {
                    originCountry: origin as any,
                    destCountry: dest as any,
                  },
                },
                update: { zoneType: zoneType as ShippingZoneType },
                create: {
                  originCountry: origin as any,
                  destCountry: dest as any,
                  zoneType: zoneType as ShippingZoneType,
                },
              })
            }
          }
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Settings updated' })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
