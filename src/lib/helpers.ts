import { Prisma } from '@prisma/client'

/**
 * Safely convert a value to a plain number.
 * Handles Prisma Decimal objects, regular numbers, and null/undefined.
 */
export function toNum(val: unknown): number {
  if (val instanceof Prisma.Decimal) return val.toNumber()
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const n = Number(val)
    return isNaN(n) ? 0 : n
  }
  return 0
}

/**
 * Recursively convert all Prisma Decimal fields in an object to numbers.
 * Useful for API response serialization.
 */
export function serializeModel<T extends Record<string, any>>(model: T): T {
  if (!model || typeof model !== 'object') return model
  const result: any = Array.isArray(model) ? [] : {}
  for (const key of Object.keys(model)) {
    const val = model[key]
    if (val instanceof Prisma.Decimal) {
      result[key] = val.toNumber()
    } else if (val && typeof val === 'object' && !ArrayBuffer.isView(val)) {
      result[key] = serializeModel(val)
    } else {
      result[key] = val
    }
  }
  return result
}
