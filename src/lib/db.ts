import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL!

  // Parse the connection URL and configure for serverless environments.
  // Neon PostgreSQL uses PgBouncer for connection pooling which doesn't
  // support prepared statements by default. We disable them here.
  let connectionString = databaseUrl

  // If using a pooled connection (port 6543 or contains 'pooler'), disable prepared statements
  const url = new URL(connectionString)
  const isPooled = url.port === '6543' || url.hostname.includes('pooler')

  // Always set pgbouncer=true for Neon serverless to disable prepared statements
  // This is safe for direct connections too (it's a no-op there)
  if (!url.searchParams.has('pgbouncer')) {
    url.searchParams.set('pgbouncer', 'true')
    connectionString = url.toString()
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
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
