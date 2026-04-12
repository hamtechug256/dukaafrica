/**
 * One-time fix script: Activate all banners and set correct position
 * Run with: npx tsx scripts/fix-banners.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Checking banners...')

  const banners = await prisma.banner.findMany()
  console.log(`Found ${banners.length} banner(s)`)

  for (const banner of banners) {
    console.log(`\nBanner: "${banner.title}"`)
    console.log(`  isActive: ${banner.isActive}`)
    console.log(`  position: ${banner.position}`)

    if (!banner.isActive) {
      await prisma.banner.update({
        where: { id: banner.id },
        data: { isActive: true },
      })
      console.log(`  → Activated!`)
    }

    // If position is HOME_TOP, also set it to HOME_SLIDER so the slider picks it up
    // (keeping HOME_TOP is fine since we removed the position filter from the slider)
  }

  console.log('\nDone! All banners are now active.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
