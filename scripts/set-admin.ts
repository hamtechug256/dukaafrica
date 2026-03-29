/**
 * Script to set SUPER_ADMIN role for a user
 * 
 * Usage: 
 *   bun run set-admin <email>
 *   
 * Example:
 *   bun run set-admin admin@duukaafrica.com
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  
  if (!email) {
    console.error('❌ Please provide an email address')
    console.log('Usage: bun run set-admin <email>')
    console.log('Example: bun run set-admin admin@duukaafrica.com')
    process.exit(1)
  }

  const normalizedEmail = email.toLowerCase().trim()

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      console.error(`❌ User with email "${email}" not found in database`)
      console.log('')
      console.log('The user needs to sign up first before being promoted to admin.')
      console.log('1. Go to your website and sign up with this email')
      console.log('2. Then run this script again')
      process.exit(1)
    }

    // Check current role
    if (user.role === 'SUPER_ADMIN') {
      console.log(`✅ User ${email} is already a SUPER_ADMIN`)
      process.exit(0)
    }

    // Update to SUPER_ADMIN
    const updatedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { role: 'SUPER_ADMIN' }
    })

    console.log('')
    console.log('✅ ═══════════════════════════════════════')
    console.log('✅ SUPER_ADMIN role granted successfully!')
    console.log('✅ ═══════════════════════════════════════')
    console.log('')
    console.log(`   Email: ${updatedUser.email}`)
    console.log(`   User ID: ${updatedUser.id}`)
    console.log(`   Name: ${updatedUser.name || 'N/A'}`)
    console.log(`   Role: ${updatedUser.role}`)
    console.log('')
    console.log('You can now access the admin dashboard at: /admin')
    console.log('')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
