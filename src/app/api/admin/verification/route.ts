/**
 * API: Admin Verification Review
 * 
 * POST /api/admin/verification
 * 
 * Admins approve or reject seller verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

// Only admins can access
async function checkAdminAccess() {
  const { userId } = await auth()
  if (!userId) return null
  
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true }
  })
  
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return null
  }
  
  return user
}

export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const {
      storeId,
      action,     // APPROVE or REJECT
      tier,       // VERIFIED or PREMIUM
      notes,
      rejectionReason
    } = body

    if (!storeId || !action) {
      return NextResponse.json(
        { error: 'Store ID and action are required' },
        { status: 400 }
      )
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { User: true }
    })

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    if (action === 'APPROVE') {
      // Update store verification status
      const updatedStore = await prisma.store.update({
        where: { id: storeId },
        data: {
          verificationStatus: 'VERIFIED',
          verificationTier: tier || 'VERIFIED',
          verifiedAt: new Date(),
          verifiedBy: admin.id,
          verificationNotes: notes,
          verificationRejectedReason: null,
          
          // Update legacy field for backward compatibility
          isVerified: true,
          
          // Update commission rate based on tier
          commissionRate: tier === 'PREMIUM' ? 8 : tier === 'VERIFIED' ? 10 : store.commissionRate
        }
      })

      // Create notification for seller
      await prisma.notification.create({
        data: {
          userId: store.userId,
          type: 'VERIFICATION_APPROVED',
          title: 'Verification Approved!',
          message: `Congratulations! Your store has been verified as a ${tier || 'VERIFIED'} seller.`,
          data: JSON.stringify({
            tier: tier || 'VERIFIED',
            commissionRate: updatedStore.commissionRate
          })
        }
      })

      // Log the action
      await prisma.securityLog.create({
        data: {
          type: 'VERIFICATION_APPROVED',
          identifier: admin.id,
          details: `Admin ${admin.id} approved verification for store ${storeId} as ${tier || 'VERIFIED'}`
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Verification approved successfully',
        store: {
          id: updatedStore.id,
          verificationStatus: updatedStore.verificationStatus,
          verificationTier: updatedStore.verificationTier,
          commissionRate: updatedStore.commissionRate
        }
      })

    } else if (action === 'REJECT') {
      if (!rejectionReason) {
        return NextResponse.json(
          { error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      // Update store verification status
      const updatedStore = await prisma.store.update({
        where: { id: storeId },
        data: {
          verificationStatus: 'REJECTED',
          verificationTier: 'STARTER',
          verifiedAt: null,
          verifiedBy: admin.id,
          verificationNotes: notes,
          verificationRejectedReason: rejectionReason,
          isVerified: false
        }
      })

      // Create notification for seller
      await prisma.notification.create({
        data: {
          userId: store.userId,
          type: 'VERIFICATION_REJECTED',
          title: 'Verification Update',
          message: `Your verification request was not approved. Reason: ${rejectionReason}`,
          data: JSON.stringify({
            reason: rejectionReason,
            canResubmit: true
          })
        }
      })

      // Log the action
      await prisma.securityLog.create({
        data: {
          type: 'VERIFICATION_REJECTED',
          identifier: admin.id,
          details: `Admin ${admin.id} rejected verification for store ${storeId}. Reason: ${rejectionReason}`
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Verification rejected',
        store: {
          id: updatedStore.id,
          verificationStatus: updatedStore.verificationStatus
        }
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use APPROVE or REJECT' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Verification review error:', error)
    return NextResponse.json(
      { error: 'Failed to process verification review' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/verification
 * 
 * Get pending verification requests
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    
    if (status === 'PENDING') {
      where.verificationStatus = 'PENDING'
    } else if (status === 'VERIFIED') {
      where.verificationStatus = 'VERIFIED'
    } else if (status === 'REJECTED') {
      where.verificationStatus = 'REJECTED'
    }

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          User: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.store.count({ where })
    ])

    return NextResponse.json({
      stores: stores.map(store => ({
        id: store.id,
        name: store.name,
        slug: store.slug,
        email: store.email,
        phone: store.phone,
        country: store.country,
        
        verificationStatus: store.verificationStatus,
        verificationTier: store.verificationTier,
        
        // Documents
        idType: store.idType,
        idNumber: store.idNumber,
        idDocumentUrl: store.idDocumentUrl,
        idDocumentBackUrl: store.idDocumentBackUrl,
        selfieWithIdUrl: store.selfieWithIdUrl,
        businessName: store.businessName,
        businessType: store.businessType,
        businessDocUrl: store.businessDocUrl,
        taxId: store.taxId,
        taxDocUrl: store.taxDocUrl,
        physicalLocationUrl: store.physicalLocationUrl,
        
        // Review info
        verifiedAt: store.verifiedAt,
        verifiedBy: store.verifiedBy,
        verificationNotes: store.verificationNotes,
        verificationRejectedReason: store.verificationRejectedReason,
        
        createdAt: store.createdAt,
        
        owner: store.User
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Get verification requests error:', error)
    return NextResponse.json(
      { error: 'Failed to get verification requests' },
      { status: 500 }
    )
  }
}
