import { Metadata } from 'next'
import CartPageClient from './cart-page-client'

export const metadata: Metadata = {
  title: 'Shopping Cart - DuukaAfrica',
  description: 'Review your shopping cart on DuukaAfrica. Manage items, apply coupons, and proceed to secure checkout with buyer protection.',
}

export default function CartPage() {
  return <CartPageClient />
}
