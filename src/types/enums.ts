// Local type definitions to replace Prisma client enums
// These are defined locally because the Prisma enums don't exist in @prisma/client

export type Currency = 'UGX' | 'KES' | 'TZS' | 'RWF' | 'USD'

export type Country = 'UGANDA' | 'KENYA' | 'TANZANIA' | 'RWANDA' | 'SOUTH_SUDAN' | 'BURUNDI'

export type UserRole = 'USER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN'

export type ShippingZoneType = 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL' | 'CROSS_BORDER' | 'DOMESTIC'

export type ProductStatus = 'DRAFT' | 'PENDING' | 'ACTIVE' | 'OUT_OF_STOCK' | 'DISCONTINUED'

export type NotificationType =
  | 'ORDER_PLACED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'NEW_MESSAGE'
  | 'PRICE_DROP'
  | 'BACK_IN_STOCK'
  | 'REVIEW_REQUEST'
  | 'PROMOTION'
  | 'SYSTEM'
