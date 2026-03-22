import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Heart, ShoppingCart, ArrowRight } from "lucide-react";

const featuredProducts = [
  {
    id: 1,
    name: "iPhone 15 Pro Max 256GB - Natural Titanium",
    price: 4500000,
    originalPrice: 5000000,
    rating: 4.8,
    reviews: 256,
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop",
    store: "Apple Store Uganda",
    isVerified: true,
    inStock: true,
  },
  {
    id: 2,
    name: "Samsung 65\" Crystal UHD 4K Smart TV",
    price: 2800000,
    originalPrice: 3200000,
    rating: 4.6,
    reviews: 189,
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop",
    store: "Samsung Brand Store",
    isVerified: true,
    inStock: true,
  },
  {
    id: 3,
    name: "Nike Air Force 1 '07 - White",
    price: 380000,
    originalPrice: 450000,
    rating: 4.9,
    reviews: 423,
    image: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400&h=400&fit=crop",
    store: "Sneaker Hub",
    isVerified: true,
    inStock: true,
  },
  {
    id: 4,
    name: "PlayStation 5 Console + 2 Controllers",
    price: 2200000,
    originalPrice: 2500000,
    rating: 4.7,
    reviews: 312,
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop",
    store: "Game Zone",
    isVerified: true,
    inStock: true,
  },
  {
    id: 5,
    name: "Dell XPS 15 Laptop - Intel i7, 16GB RAM",
    price: 4200000,
    originalPrice: 4800000,
    rating: 4.5,
    reviews: 98,
    image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop",
    store: "Tech World",
    isVerified: true,
    inStock: true,
  },
  {
    id: 6,
    name: "JBL PartyBox 710 - Portable Speaker",
    price: 1800000,
    originalPrice: 2100000,
    rating: 4.8,
    reviews: 167,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop",
    store: "Sound Masters",
    isVerified: true,
    inStock: true,
  },
  {
    id: 7,
    name: "Adidas Originals Superstar - Black/White",
    price: 320000,
    originalPrice: 380000,
    rating: 4.7,
    reviews: 289,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop",
    store: "Sneaker Hub",
    isVerified: true,
    inStock: true,
  },
  {
    id: 8,
    name: "Canon EOS R50 Mirrorless Camera Kit",
    price: 3500000,
    originalPrice: 4000000,
    rating: 4.9,
    reviews: 56,
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop",
    store: "Camera World",
    isVerified: true,
    inStock: true,
  },
];

export function FeaturedProducts() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
            <p className="text-gray-500 mt-1">Top picks from verified sellers</p>
          </div>
          <Link 
            href="/products/featured" 
            className="text-primary font-medium flex items-center hover:underline"
          >
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="h-full overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="relative overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Discount Badge */}
                  {product.originalPrice > product.price && (
                    <Badge className="absolute top-2 left-2 bg-red-500">
                      -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                    </Badge>
                  )}
                  {/* Quick Actions */}
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3 md:p-4">
                  {/* Store */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <span>{product.store}</span>
                    {product.isVerified && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">✓ Verified</Badge>
                    )}
                  </div>
                  
                  {/* Product Name */}
                  <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.floor(product.rating)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      ({product.reviews})
                    </span>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-bold text-primary">
                      USh {product.price.toLocaleString()}
                    </span>
                    {product.originalPrice > product.price && (
                      <span className="text-xs text-gray-400 line-through">
                        USh {product.originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  {/* Add to Cart */}
                  <Button 
                    size="sm" 
                    className="w-full mt-3 bg-primary hover:bg-primary/90"
                    onClick={(e) => {
                      e.preventDefault();
                      // Add to cart logic
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
