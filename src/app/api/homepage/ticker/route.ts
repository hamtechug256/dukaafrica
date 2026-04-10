/**
 * API: Homepage Live Pulse Ticker Data
 *
 * GET /api/homepage/ticker
 * Returns recent platform activity items for the live ticker.
 * Uses anonymized, real data from the database.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSettingsByGroup } from '@/lib/site-settings'
import { COUNTRY_CITIES, getRandomCity, Country } from '@/lib/currency'

// Helper: pick a random city from any supported country
function getRandomCityFromAll(): string {
  const countries = Object.keys(COUNTRY_CITIES) as Country[]
  const randomCountry = countries[Math.floor(Math.random() * countries.length)]
  return getRandomCity(randomCountry)
}

const FIRST_NAMES = [
  'Sarah', 'David', 'Grace', 'Joseph', 'Patience', 'Robert', 'Mercy',
  'Samuel', 'Esther', 'Peter', 'Florence', 'Martin', 'Diana', 'Andrew',
  'Jackline', 'Michael', 'Prossy', 'Daniel', 'Vivian', 'James',
]

export async function GET() {
  try {
    // Get ticker configuration
    const tickerSettings = await getSettingsByGroup('homepage_ticker', true)

    if (tickerSettings.ticker_enabled === false) {
      return NextResponse.json({ success: true, items: [] })
    }

    const items: Array<{
      id: string
      type: 'purchase' | 'seller' | 'platform'
      text: string
      icon: string
    }> = []

    // 1. Recent orders (last 48 hours)
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
      },
      include: {
        User: { select: { country: true } },
        OrderItem: {
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    for (const order of recentOrders) {
      const city = order.User?.country
        ? getRandomCity(order.User.country)
        : getRandomCityFromAll()
      const name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
      const productName = order.OrderItem[0]?.productName || 'a product'
      const template = tickerSettings.ticker_template_buy || '{name} from {city} just purchased a {product}'

      items.push({
        id: `order-${order.id}`,
        type: 'purchase',
        text: template
          .replace('{name}', name)
          .replace('{city}', city)
          .replace('{product}', productName.length > 40 ? productName.slice(0, 40) + '...' : productName),
        icon: 'ShoppingBag',
      })
    }

    // 2. Recent verified sellers (last 7 days)
    const recentSellers = await prisma.store.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        OR: [{ isVerified: true }, { verificationStatus: 'VERIFIED' }],
      },
      include: { User: { select: { country: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    for (const store of recentSellers) {
      const city = store.User?.country
        ? getRandomCity(store.User.country)
        : getRandomCityFromAll()
      const template = tickerSettings.ticker_template_seller || 'A new verified seller from {city} joined today'

      items.push({
        id: `seller-${store.id}`,
        type: 'seller',
        text: template.replace('{city}', city),
        icon: 'Store',
      })
    }

    // 3. Platform-level stats
    const ordersLastHour = await prisma.order.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    })

    if (ordersLastHour > 0) {
      const template =
        tickerSettings.ticker_template_platform || '{count} products sold in the last hour'
      items.push({
        id: 'platform-hourly',
        type: 'platform',
        text: template.replace('{count}', String(ordersLastHour)),
        icon: 'TrendingUp',
      })
    }

    // Shuffle for variety, keep platform items at end
    const purchases = items.filter((i) => i.type === 'purchase')
    const sellers = items.filter((i) => i.type === 'seller')
    const platform = items.filter((i) => i.type === 'platform')

    purchases.sort(() => Math.random() - 0.5)
    sellers.sort(() => Math.random() - 0.5)

    const shuffled = [...purchases, ...sellers, ...platform]

    if (shuffled.length === 0) {
      return NextResponse.json({ success: true, items: [] })
    }

    return NextResponse.json({
      success: true,
      items: shuffled.slice(0, 15),
    })
  } catch (error) {
    console.error('Error fetching ticker data:', error)
    return NextResponse.json({ success: true, items: [] })
  }
}
