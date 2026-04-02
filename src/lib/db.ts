import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import type { PoolConfig } from '@neondatabase/serverless'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!

  // Use Neon adapter for serverless/postgres-proxy connections.
  // This handles connection pooling correctly and avoids prepared statement
  // issues with PgBouncer and Neon's serverless driver.
  const adapter = new PrismaNeon({ connectionString } as PoolConfig)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

const basePrisma = globalForPrisma.prisma ?? createPrismaClient()

// Auto-filter soft-deleted products via Prisma Client Extension.
// All read queries on Product will automatically exclude records where
// deletedAt is set, unless the caller explicitly includes deletedAt
// in their where clause (e.g., admin views with deletedAt: undefined).
const softDeleteFilter = <T>(args: T): T => {
  if (args && typeof args === 'object') {
    // Always inject deletedAt filter, even when no 'where' clause was provided.
    // This fixes groupBy/aggregate calls that omit 'where' from their args.
    const where = (args as any).where || {}
    if (!('deletedAt' in where)) {
      ;(args as any).where = { ...where, deletedAt: null }
    }
  }
  return args
}

export const prisma = basePrisma.$extends({
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
}) as any as PrismaClient

// Also export as db for backward compatibility
export const db = prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma
