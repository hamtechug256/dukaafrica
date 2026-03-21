import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, Shield, Headphones } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primary to-emerald-700 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container relative py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Trusted by 100,000+ customers across East Africa
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Shop the Best of
              <span className="block text-emerald-400">East Africa</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-xl mx-auto lg:mx-0">
              Discover millions of products from verified sellers. Quality electronics, fashion, home essentials & more at unbeatable prices.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/products">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100 text-lg px-8">
                  Start Shopping
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/seller">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                  Sell on DuukaAfrica
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/20">
              <div>
                <div className="text-3xl font-bold">50K+</div>
                <div className="text-sm text-gray-300">Products</div>
              </div>
              <div>
                <div className="text-3xl font-bold">5K+</div>
                <div className="text-sm text-gray-300">Verified Sellers</div>
              </div>
              <div>
                <div className="text-3xl font-bold">6</div>
                <div className="text-sm text-gray-300">Countries</div>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image/Grid */}
          <div className="hidden lg:block relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 transform hover:scale-105 transition-transform">
                  <img 
                    src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop" 
                    alt="Electronics" 
                    className="rounded-xl w-full h-40 object-cover"
                  />
                  <p className="mt-2 font-medium">Electronics</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 transform hover:scale-105 transition-transform">
                  <img 
                    src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=300&fit=crop" 
                    alt="Fashion" 
                    className="rounded-xl w-full h-32 object-cover"
                  />
                  <p className="mt-2 font-medium">Fashion</p>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 transform hover:scale-105 transition-transform">
                  <img 
                    src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop" 
                    alt="Home" 
                    className="rounded-xl w-full h-32 object-cover"
                  />
                  <p className="mt-2 font-medium">Home & Living</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 transform hover:scale-105 transition-transform">
                  <img 
                    src="https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&h=300&fit=crop" 
                    alt="Sneakers" 
                    className="rounded-xl w-full h-40 object-cover"
                  />
                  <p className="mt-2 font-medium">Footwear</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/20">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">Free Delivery</div>
              <div className="text-sm text-gray-300">On orders over USh 100,000</div>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">Buyer Protection</div>
              <div className="text-sm text-gray-300">Secure payments guaranteed</div>
            </div>
          </div>
          <div className="flex items-center gap-4 justify-center md:justify-end">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <div className="font-semibold">24/7 Support</div>
              <div className="text-sm text-gray-300">Dedicated customer service</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
