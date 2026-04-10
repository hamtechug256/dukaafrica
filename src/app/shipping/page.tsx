import { Header } from '@/components/home/header'
import { Footer } from '@/components/home/footer'
import { Card, CardContent } from '@/components/ui/card'
import { Truck, MapPin, Clock, Package, CheckCircle } from 'lucide-react'
import { Metadata } from 'next'
import { COUNTRY_INFO, type Country } from '@/lib/currency'

export const metadata: Metadata = {
  title: 'Shipping Information - DuukaAfrica | Delivery Across East Africa',
  description: 'Learn about DuukaAfrica shipping zones, delivery times, and costs across East Africa. Free shipping on qualifying orders.',
  openGraph: {
    title: 'Shipping Information - DuukaAfrica',
    description: 'Fast, reliable delivery across East Africa. Free shipping on qualifying orders.',
    type: 'website',
  },
}

export default function ShippingPage() {
  // Build zone list dynamically from supported countries
  const zones = (Object.keys(COUNTRY_INFO) as Country[]).map(code => {
    const info = COUNTRY_INFO[code]
    // Use the capital/major city for each country as the primary zone
    const capitalCity = code === 'UGANDA' ? 'Kampala Metro'
      : code === 'KENYA' ? 'Kenya (Nairobi)'
      : code === 'TANZANIA' ? 'Tanzania (Dar es Salaam)'
      : code === 'RWANDA' ? 'Rwanda (Kigali)'
      : code === 'SOUTH_SUDAN' ? 'South Sudan (Juba)'
      : code === 'BURUNDI' ? 'Burundi (Bujumbura)'
      : `${info.name}`
    return {
      name: `${info.flag} ${capitalCity}`,
      time: code === 'UGANDA' ? 'Same day - 24 hours' : '1-3 days',
      price: 'Varies by distance & weight',
    }
  }).concat([
    { name: 'Regional (Other cities)', time: '3-5 days', price: 'Varies by weight' },
    { name: 'Rural Areas', time: '5-10 days', price: 'Varies by distance' },
  ])

  return (
    <div className="min-h-screen flex flex-col bg-[oklch(0.99_0.005_85)] dark:bg-[oklch(0.12_0.02_45)]">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <div className="text-white py-16" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40), oklch(0.55 0.15 140))' }}>  
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold mb-4">Shipping Information</h1>
            <p className="text-xl text-white/80">Fast, reliable delivery across East Africa</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Overview */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardContent className="p-6 text-center">
                <Truck className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Fast Delivery</h3>
                <p className="text-sm text-gray-600">Same-day delivery in major cities</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <MapPin className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Wide Coverage</h3>
                <p className="text-sm text-gray-600">Delivering across East Africa</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Package className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Track Your Order</h3>
                <p className="text-sm text-gray-600">Real-time tracking for all shipments</p>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Zones */}
          <h2 className="text-2xl font-bold mb-6">Delivery Zones & Times</h2>
          <Card className="mb-12">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold">Zone</th>
                      <th className="text-left p-4 font-semibold">Delivery Time</th>
                      <th className="text-left p-4 font-semibold">Price Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((zone, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="p-4 font-medium">{zone.name}</td>
                        <td className="p-4">{zone.time}</td>
                        <td className="p-4">{zone.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Policy */}
          <h2 className="text-2xl font-bold mb-6">Shipping Policy</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Free Shipping</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span>Qualifying orders receive free shipping within their local metro area</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span>Selected products marked "Free Shipping"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span>Promotional free shipping offers</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Important Notes</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>Orders placed before 2 PM ship same day</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>Weekend deliveries available in select areas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>Signature required for high-value orders</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
