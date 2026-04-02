import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Auto-filter soft-deleted products via Prisma Client Extension.
// All read queries on Product will automatically exclude records where
// deletedAt is set, unless the caller explicitly includes deletedAt
// in their where clause (e.g., admin views with deletedAt: undefined).
const softDeleteFilter = <T>(args: T): T => {
  if (args && typeof args === 'object' && 'where' in args) {
    const where = (args as any).where || {}
    if (!('deletedAt' in where)) {
      ;(args as any).where = { ...where, deletedAt: null }
    }
  }
  return args
}

// Build the extended Prisma client with soft-delete filter.
// Wrapped in try/catch so that if the $extends() API has issues at runtime,
// we fall back to the raw Prisma client instead of crashing all queries.
let extendedPrisma: any
try {
  extendedPrisma = basePrisma.$extends({
    query: {
      product: {
        findMany({ args, query }) { return query(softDeleteFilter(args)) },
        findFirst({ args, query }) { return query(softDeleteFilter(args)) },
        findUnique({ args, query }) { return query(softDeleteFilter(args)) },
        count({ args, query }) { return query(softDeleteFilter(args)) },
        aggregate({ args, query }) { return query(softDeleteFilter(args)) },
        groupBy({ args, query }) { return query(softDeleteFilter(args)) },
      },
    },
  })
} catch (error) {
  console.error('[DB] Failed to create extended Prisma client, falling back to raw client:', error)
  extendedPrisma = basePrisma
}

export const prisma = extendedPrisma as any as PrismaClient

// Export raw base client for health checks and diagnostics (bypasses extensions)
export { basePrisma }

// Also export as db for backward compatibility
export const db = prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma
