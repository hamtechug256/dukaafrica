import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, MapPin, Store, CheckCircle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

// Get all stores with product counts
async function getStores() {
  const stores = await prisma.store.findMany({
    where: {
      isActive: true,
    },
    orderBy: [
      { isVerified: 'desc' },
      { rating: 'desc' },
    ],
  })

  // Get product counts separately
  const storesWithCounts = await Promise.all(
    stores.map(async (store) => {
      const productCount = await prisma.product.count({
        where: {
          storeId: store.id,
          status: 'ACTIVE',
        },
      })
      return { ...store, productCount }
    })
  )

  return storesWithCounts
}

export default async function StoresPage() {
  const stores = await getStores()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900">All Stores</h1>
            <p className="text-gray-600 mt-2">
              Discover verified sellers across East Africa
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {stores.length === 0 ? (
            <div className="text-center py-16">
              <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No stores yet</h2>
              <p className="text-gray-600 mb-6">Be the first to start selling on DuukaAfrica!</p>
              <Link href="/seller">
                <Button>Start Your Store</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stores.map((store) => (
                <Link key={store.id} href={`/stores/${store.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full">
                    {/* Banner */}
                    <div className="relative h-28 bg-gray-100">
                      {store.banner ? (
                        <img 
                          src={store.banner} 
                          alt={store.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-primary/20 to-emerald-500/20" />
                      )}
                      
                      {/* Logo */}
                      <div className="absolute -bottom-8 left-4">
                        <div className="w-16 h-16 rounded-xl border-4 border-white bg-white overflow-hidden shadow-lg">
                          {store.logo ? (
                            <img 
                              src={store.logo} 
                              alt={store.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <Store className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Verified Badge */}
                      {store.isVerified && (
                        <Badge className="absolute top-2 right-2 bg-emerald-500 hover:bg-emerald-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    <CardContent className="pt-12 pb-4 px-4">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {store.name}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        {store.city && (
                          <>
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{store.city}, {store.country}</span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="font-medium">{store.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-600">
                          {store.productCount} products
                        </span>
                      </div>
                      
                      {store.description && (
                        <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                          {store.description}
                        </p>
                      )}
                      
                      <Button variant="outline" size="sm" className="w-full mt-4">
                        Visit Store
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
