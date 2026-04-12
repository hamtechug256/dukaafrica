import { Metadata } from 'next'
import HomePage from './home-page-client'

export const metadata: Metadata = {
  title: "DuukaAfrica - Buy and Sell Products Online Across Africa",
  description:
    "DuukaAfrica is East Africa's trusted online marketplace. Shop thousands of products from verified sellers across Uganda, Kenya, Tanzania, and Rwanda with secure escrow payments and buyer protection.",
  keywords: [
    "online marketplace Africa",
    "buy products online Uganda",
    "sell products online Kenya",
    "East Africa e-commerce",
    "escrow payment",
    "buyer protection",
    "verified sellers",
    "DuukaAfrica",
  ],
  alternates: {
    canonical: "https://duukaafrica.com",
  },
}

export default function Home() {
  return <HomePage />
}
