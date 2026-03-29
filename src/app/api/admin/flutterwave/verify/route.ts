/**
 * API: Test Flutterwave Configuration
 * 
 * GET /api/admin/flutterwave/test
 * 
 * Tests the Flutterwave API connection and returns configuration status.
 * Helps admins verify their payment setup is working correctly.
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { getFlutterwaveConfig, flutterwaveClient } from '@/lib/flutterwave/client'

async function checkAdminAccess() {
  try {
    const { userId } = await auth()
    if (!userId) return null
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true }
    })
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
    return user
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get configuration
    const config = await getFlutterwaveConfig()

    // Check what's configured
    const configStatus = {
      hasPublicKey: !!config.publicKey,
      hasSecretKey: !!config.secretKey,
      hasEncryptionKey: !!config.encryptionKey,
      hasWebhookHash: !!config.webhookHash,
      publicKeyPrefix: config.publicKey ? config.publicKey.substring(0, 10) + '...' : null,
      secretKeyPrefix: config.secretKey ? config.secretKey.substring(0, 10) + '...' : null,
      isProduction: config.secretKey?.startsWith('FLWSECK_PROD') || false,
      isTest: config.secretKey?.startsWith('FLWSECK_TEST') || false,
    }

    // Check database vs env var source
    const platformSettings = await prisma.platformSettings.findFirst()
    const configSource = {
      usingDatabaseConfig: !!(platformSettings?.flutterwaveSecretKey),
      usingEnvConfig: !platformSettings?.flutterwaveSecretKey && !!process.env.FLUTTERWAVE_SECRET_KEY,
    }

    // Test API connection
    let apiTest = { success: false, error: null as string | null, balance: null as any }
    
    if (config.secretKey) {
      try {
        const balanceResponse = await flutterwaveClient.getBalance('UGX')
        if (balanceResponse.status === 'success') {
          apiTest.success = true
          apiTest.balance = {
            currency: balanceResponse.data.currency,
            availableBalance: balanceResponse.data.available_balance,
            ledgerBalance: balanceResponse.data.ledger_balance,
          }
        }
      } catch (error: any) {
        apiTest.error = error.message || 'API connection failed'
      }
    } else {
      apiTest.error = 'No secret key configured'
    }

    // Test banks API (lighter test)
    let banksTest = { success: false, error: null as string | null, bankCount: 0 }
    
    if (config.secretKey) {
      try {
        const banksResponse = await flutterwaveClient.getBanks('UG')
        if (banksResponse.status === 'success') {
          banksTest.success = true
          banksTest.bankCount = banksResponse.data.length
        }
      } catch (error: any) {
        banksTest.error = error.message || 'Failed to fetch banks'
      }
    }

    // Overall status
    const isFullyConfigured = 
      configStatus.hasPublicKey && 
      configStatus.hasSecretKey && 
      configStatus.hasEncryptionKey &&
      apiTest.success

    // Recommendations
    const recommendations: string[] = []
    
    if (!configStatus.hasPublicKey) {
      recommendations.push('Add Flutterwave Public Key (NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY)')
    }
    if (!configStatus.hasSecretKey) {
      recommendations.push('Add Flutterwave Secret Key (FLUTTERWAVE_SECRET_KEY)')
    }
    if (!configStatus.hasEncryptionKey) {
      recommendations.push('Add Flutterwave Encryption Key (FLUTTERWAVE_ENCRYPTION_KEY)')
    }
    if (!configStatus.hasWebhookHash) {
      recommendations.push('Add Flutterwave Webhook Hash for payment confirmation')
    }
    if (configStatus.isTest) {
      recommendations.push('Switch to production keys when ready to go live')
    }
    if (apiTest.success && !platformSettings?.flutterwaveSecretKey) {
      recommendations.push('Consider saving keys in Admin Settings for easier management')
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      configuration: {
        ...configStatus,
        ...configSource,
      },
      tests: {
        apiConnection: apiTest,
        banksApi: banksTest,
      },
      status: {
        isFullyConfigured,
        canAcceptPayments: isFullyConfigured && apiTest.success,
        canProcessPayouts: isFullyConfigured && apiTest.success && (apiTest.balance?.availableBalance > 0),
      },
      recommendations,
    })

  } catch (error) {
    console.error('Flutterwave test error:', error)
    return NextResponse.json(
      { error: 'Failed to test Flutterwave configuration' },
      { status: 500 }
    )
  }
}
