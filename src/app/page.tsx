import { Metadata } from 'next'
import HomePage from './home-page-client'

export const metadata: Metadata = {
  title: 'DuukaAfrica - Buy and Sell Products Online Across Africa',
  description: 'DuukaAfrica is East Africa\'s trusted online marketplace. Shop thousands of products from verified sellers across Uganda, Kenya, Tanzania, and Rwanda with secure escrow payments and buyer protection.',
  keywords: 'online marketplace, buy products, sell products, Uganda, Kenya, Tanzania, Rwanda, escrow payment, buyer protection',
}

export default function Home() {
  return <HomePage />
}
