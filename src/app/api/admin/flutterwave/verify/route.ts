/**
 * API: Test Flutterwave Configuration
 * 
 * GET /api/admin/flutterwave/verify
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
    }

    // Check database vs env var source
    const platformSettings = await prisma.platformSettings.findFirst()
    const configSource = {
      usingDatabaseConfig: !!(platformSettings?.flutterwaveSecretKey),
      usingEnvConfig: !platformSettings?.flutterwaveSecretKey && !!process.env.FLUTTERWAVE_SECRET_KEY,
    }

    // Test API connection - try balance first, then banks as fallback
    let apiTest = { success: false, error: null as string | null, balance: null as any }
    let banksTest = { success: false, error: null as string | null, bankCount: 0 }
    
    if (config.secretKey) {
      // Try balance API first
      try {
        const balanceResponse = await flutterwaveClient.getBalance('UGX')
        if (balanceResponse.status === 'success') {
          apiTest.success = true
          apiTest.balance = {
            currency: balanceResponse.data.currency,
            availableBalance: balanceResponse.data.available_balance,
            ledgerBalance: balanceResponse.data.ledger_balance,
          }
        } else {
          apiTest.error = balanceResponse.message || 'Balance check failed'
        }
      } catch (error: any) {
        // Extract meaningful error message
        const errorMsg = error.message || 'API connection failed'
        if (errorMsg.includes('fetch')) {
          apiTest.error = 'Network error - check internet connection'
        } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          apiTest.error = 'Invalid API key - check your secret key'
        } else if (errorMsg.includes('balance')) {
          apiTest.error = 'No UGX balance wallet found - this is normal for new accounts'
        } else {
          apiTest.error = errorMsg.substring(0, 100)
        }
      }

      // Try banks API as secondary test (works even without balance)
      try {
        const banksResponse = await flutterwaveClient.getBanks('UG')
        if (banksResponse.status === 'success') {
          banksTest.success = true
          banksTest.bankCount = banksResponse.data.length
        } else {
          banksTest.error = banksResponse.message || 'Failed to fetch banks'
        }
      } catch (error: any) {
        const errorMsg = error.message || 'Failed to fetch banks'
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          banksTest.error = 'Invalid API key - check your secret key'
        } else {
          banksTest.error = errorMsg.substring(0, 100)
        }
      }
    } else {
      apiTest.error = 'No secret key configured'
      banksTest.error = 'No secret key configured'
    }

    // Overall status - success if either API works
    const isApiWorking = apiTest.success || banksTest.success
    const isFullyConfigured = 
      configStatus.hasPublicKey && 
      configStatus.hasSecretKey && 
      configStatus.hasEncryptionKey &&
      isApiWorking

    // Recommendations
    const recommendations: string[] = []
    
    if (!configStatus.hasPublicKey) {
      recommendations.push('Add Flutterwave Public Key')
    }
    if (!configStatus.hasSecretKey) {
      recommendations.push('Add Flutterwave Secret Key')
    }
    if (!configStatus.hasEncryptionKey) {
      recommendations.push('Add Flutterwave Encryption Key')
    }
    if (!configStatus.hasWebhookHash) {
      recommendations.push('Add Flutterwave Webhook Hash for payment confirmation')
    }
    if (config.secretKey?.startsWith('FLWSECK_TEST')) {
      recommendations.push('Currently using TEST keys - switch to PRODUCTION keys to go live')
    }
    if (isApiWorking && !platformSettings?.flutterwaveSecretKey) {
      recommendations.push('Keys loaded from .env - save in Admin Settings for easier management')
    }
    if (!apiTest.success && banksTest.success) {
      recommendations.push('Balance check failed (normal for new accounts) - API connection is working')
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
        canAcceptPayments: isFullyConfigured && isApiWorking,
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
