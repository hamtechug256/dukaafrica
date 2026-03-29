import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, Store } from "lucide-react";

const stores = [
  {
    id: 1,
    name: "Apple Store Uganda",
    logo: "https://images.unsplash.com/photo-1621768216002-5ac171876625?w=100&h=100&fit=crop",
    banner: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=200&fit=crop",
    rating: 4.9,
    products: 156,
    followers: 12500,
    isVerified: true,
    isTopSeller: true,
    category: "Electronics",
  },
  {
    id: 2,
    name: "Fashion Hub",
    logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop",
    banner: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=200&fit=crop",
    rating: 4.8,
    products: 892,
    followers: 23400,
    isVerified: true,
    isTopSeller: true,
    category: "Fashion",
  },
  {
    id: 3,
    name: "Tech World",
    logo: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop",
    banner: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=200&fit=crop",
    rating: 4.7,
    products: 423,
    followers: 8900,
    isVerified: true,
    isTopSeller: false,
    category: "Electronics",
  },
  {
    id: 4,
    name: "Home Essentials",
    logo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop",
    banner: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=200&fit=crop",
    rating: 4.6,
    products: 678,
    followers: 15600,
    isVerified: true,
    isTopSeller: true,
    category: "Home & Garden",
  },
];

export function StoresSection() {
  return (
    <section className="py-12 bg-white">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Top Verified Stores</h2>
            <p className="text-gray-500 mt-1">Shop from trusted sellers with excellent ratings</p>
          </div>
          <Link 
            href="/stores" 
            className="text-primary font-medium flex items-center hover:underline"
          >
            View All Stores <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stores.map((store) => (
            <Link key={store.id} href={`/stores/${store.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                {/* Banner */}
                <div className="relative h-24 bg-gray-100">
                  <img 
                    src={store.banner} 
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Logo */}
                  <div className="absolute -bottom-8 left-4">
                    <div className="w-16 h-16 rounded-xl border-4 border-white bg-white overflow-hidden shadow-lg">
                      <img 
                        src={store.logo} 
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {store.isTopSeller && (
                      <Badge className="bg-yellow-500 text-xs">Top Seller</Badge>
                    )}
                  </div>
                </div>
                
                <CardContent className="pt-12 pb-4 px-4">
                  {/* Store Info */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {store.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>{store.category}</span>
                        {store.isVerified && (
                          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">{store.rating}</span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">{store.products} products</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">{(store.followers / 1000).toFixed(1)}k followers</span>
                  </div>
                  
                  {/* Follow Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={(e) => {
                      e.preventDefault();
                      // Follow store logic
                    }}
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Visit Store
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Become a Seller CTA */}
        <div className="mt-12 bg-gradient-to-r from-primary to-emerald-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Start Selling on DuukaAfrica</h3>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">
            Join thousands of successful sellers across East Africa. Reach millions of customers and grow your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/seller/register">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
                Start Selling Free
              </Button>
            </Link>
            <Link href="/seller/learn-more">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
