/**
 * API: Seller Verification Submission
 * 
 * POST /api/seller/verification
 * 
 * Sellers submit their verification documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      targetTier, // STARTER, VERIFIED, PREMIUM
      
      // ID Verification
      idType,        // NATIONAL_ID, PASSPORT, DRIVING_LICENSE
      idNumber,
      idDocumentUrl,
      idDocumentBackUrl,
      selfieWithIdUrl,
      
      // Business Verification
      businessName,
      businessType,
      businessDocUrl,
      
      // Tax Verification
      taxId,
      taxDocUrl,
      
      // Physical Location
      physicalLocationUrl,
    } = body

    // Get user and store - use explicit select for backward compatibility (must be active)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId, isActive: true },
      select: {
        id: true,
        Store: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
            verificationTier: true,
          }
        }
      }
    })

    if (!user || !user.Store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const store = user.Store

    // Guard: prevent duplicate submissions while already pending
    if (store.verificationStatus === 'PENDING') {
      return NextResponse.json({
        error: 'Verification already in progress',
        details: { currentStatus: store.verificationStatus, message: 'Your application is being reviewed. Please wait for a decision before resubmitting.' }
      }, { status: 400 })
    }

    // Guard: prevent re-verification of already verified sellers
    if (store.verificationStatus === 'VERIFIED' || store.verificationStatus === 'PREMIUM') {
      return NextResponse.json({
        error: 'Already verified',
        details: { currentStatus: store.verificationStatus, message: 'Your store is already verified. Contact support if you need to make changes.' }
      }, { status: 400 })
    }

    // Validate required fields based on target tier
    const validationErrors: string[] = []

    if (targetTier === 'VERIFIED' || targetTier === 'PREMIUM') {
      if (!idType) validationErrors.push('ID type is required')
      if (!idNumber) validationErrors.push('ID number is required')
      if (!idDocumentUrl) validationErrors.push('ID document is required')
      if (!selfieWithIdUrl) validationErrors.push('Selfie with ID is required')
    }

    if (targetTier === 'PREMIUM') {
      if (!businessName) validationErrors.push('Business name is required')
      if (!businessDocUrl) validationErrors.push('Business document is required')
      if (!taxId) validationErrors.push('Tax ID is required')
      if (!taxDocUrl) validationErrors.push('Tax document is required')
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Update store with verification documents
    const updateData: any = {
      verificationStatus: 'PENDING',
      verificationTier: targetTier || store.verificationTier,
    }

    // Add ID verification data
    if (idType) updateData.idType = idType
    if (idNumber) updateData.idNumber = idNumber
    if (idDocumentUrl) updateData.idDocumentUrl = idDocumentUrl
    if (idDocumentBackUrl) updateData.idDocumentBackUrl = idDocumentBackUrl
    if (selfieWithIdUrl) updateData.selfieWithIdUrl = selfieWithIdUrl

    // Add business data
    if (businessName) updateData.businessName = businessName
    if (businessType) updateData.businessType = businessType
    if (businessDocUrl) updateData.businessDocUrl = businessDocUrl

    // Add tax data
    if (taxId) updateData.taxId = taxId
    if (taxDocUrl) updateData.taxDocUrl = taxDocUrl

    // Add physical location
    if (physicalLocationUrl) updateData.physicalLocationUrl = physicalLocationUrl

    const updatedStore = await prisma.store.update({
      where: { id: store.id },
      data: updateData
    })

    // Create notification for admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'VERIFICATION_PENDING',
          title: 'New Seller Verification Request',
          message: `${store.name} has submitted documents for ${targetTier} verification.`,
          data: JSON.stringify({
            storeId: store.id,
            storeName: store.name,
            targetTier
          })
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Verification documents submitted successfully. We will review within 24-48 hours.',
      store: {
        id: updatedStore.id,
        verificationStatus: updatedStore.verificationStatus,
        verificationTier: updatedStore.verificationTier
      }
    })

  } catch (error) {
    console.error('Verification submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit verification' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seller/verification
 * 
 * Get current verification status
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use explicit select for backward compatibility with missing database columns (must be active)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId, isActive: true },
      select: {
        id: true,
        Store: {
          select: {
            id: true,
            name: true,
            verificationStatus: true,
            verificationTier: true,
            idType: true,
            idNumber: true,
            idDocumentUrl: true,
            idDocumentBackUrl: true,
            selfieWithIdUrl: true,
            businessName: true,
            businessType: true,
            businessDocUrl: true,
            taxId: true,
            taxDocUrl: true,
            physicalLocationUrl: true,
            verifiedAt: true,
            verificationNotes: true,
            verificationRejectedReason: true,
          }
        }
      }
    })

    if (!user || !user.Store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    const store = user.Store

    return NextResponse.json({
      verification: {
        status: store.verificationStatus,
        tier: store.verificationTier,

        // ID Verification
        idType: store.idType,
        idNumber: store.idNumber,
        idDocumentUrl: store.idDocumentUrl,
        idDocumentBackUrl: store.idDocumentBackUrl,
        selfieWithIdUrl: store.selfieWithIdUrl,

        // Business
        businessName: store.businessName,
        businessType: store.businessType,
        businessDocUrl: store.businessDocUrl,

        // Tax
        taxId: store.taxId,
        taxDocUrl: store.taxDocUrl,

        // Location
        physicalLocationUrl: store.physicalLocationUrl,

        // Review
        verifiedAt: store.verifiedAt,
        verificationNotes: store.verificationNotes,
        verificationRejectedReason: store.verificationRejectedReason
      }
    })

  } catch (error) {
    console.error('Get verification error:', error)
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    )
  }
}
