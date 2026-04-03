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

  const url = new URL(connectionString)

  // Always set pgbouncer=true for Neon serverless to disable prepared statements.
  // This is safe for direct connections too (it's a no-op there).
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

// Track whether the deletedAt column exists in the database.
// If it doesn't exist (schema drift), we skip the soft-delete filter
// to prevent all product queries from failing.
let deletedAtColumnExists: boolean | null = null

async function checkDeletedAtColumn(): Promise<boolean> {
  if (deletedAtColumnExists !== null) return deletedAtColumnExists
  try {
    await basePrisma.$queryRaw`SELECT "deletedAt" FROM "Product" LIMIT 0`
    deletedAtColumnExists = true
  } catch {
    deletedAtColumnExists = false
  }
  return deletedAtColumnExists
}

// Auto-filter soft-deleted products via Prisma Client Extension.
// Only applies the filter if the deletedAt column actually exists in the DB.
const softDeleteFilter = <T>(args: T): T => {
  if (args && typeof args === 'object') {
    // Only inject deletedAt filter if the column exists in the database.
    // This prevents crashes when the schema hasn't been synced yet.
    if (deletedAtColumnExists === true) {
      const where = (args as any).where || {}
      if (!('deletedAt' in where)) {
        ;(args as any).where = { ...where, deletedAt: null }
      }
    }
  }
  return args
}

// Wrap each query method to check column existence before applying filter
async function withSoftDeleteCheck<T>(
  args: any,
  queryFn: (args: any) => Promise<T>
): Promise<T> {
  if (deletedAtColumnExists === null) {
    await checkDeletedAtColumn()
  }
  return queryFn(softDeleteFilter(args))
}

export const prisma = basePrisma.$extends({
  query: {
    product: {
      findMany({ args, query }) { return withSoftDeleteCheck(args, query) },
      findFirst({ args, query }) { return withSoftDeleteCheck(args, query) },
      findUnique({ args, query }) { return withSoftDeleteCheck(args, query) },
      count({ args, query }) { return withSoftDeleteCheck(args, query) },
      aggregate({ args, query }) { return withSoftDeleteCheck(args, query) },
      groupBy({ args, query }) { return withSoftDeleteCheck(args, query) },
    },
  },
}) as any as PrismaClient

// Also export as db for backward compatibility
export const db = prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma
