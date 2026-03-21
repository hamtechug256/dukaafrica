// DuukaAfrica - Home Page Sections
// All home page components combined in one file for easier management

'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowRight, Truck, Shield, CreditCard, Headphones, 
  BadgeCheck, RefreshCcw, Clock, Flame, ChevronLeft, 
  ChevronRight, Star, Heart, ShoppingCart, Store, 
  Smartphone, Mail, MapPin, Search, Menu, User,
  Package, Settings, LogOut, LayoutDashboard
} from "lucide-react";
import { useState, useEffect } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";

// ============================================
// HEADER COMPONENT
// ============================================

const headerCategories = [
  { name: "Electronics", href: "/categories/electronics", icon: "📱" },
  { name: "Fashion", href: "/categories/fashion", icon: "👗" },
  { name: "Home & Garden", href: "/categories/home-garden", icon: "🏠" },
  { name: "Beauty", href: "/categories/beauty", icon: "💄" },
  { name: "Sports", href: "/categories/sports", icon: "⚽" },
  { name: "Vehicles", href: "/categories/vehicles", icon: "🚗" },
  { name: "Real Estate", href: "/categories/real-estate", icon: "🏢" },
  { name: "Jobs", href: "/categories/jobs", icon: "💼" },
];

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white py-1.5 text-sm">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Deliver to Uganda
            </span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">Free delivery on orders over USh 100,000</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/seller" className="hover:underline hidden sm:inline-flex items-center gap-1">
              <Store className="h-3.5 w-3.5" />
              Sell on DuukaAfrica
            </Link>
            <Link href="/help" className="hover:underline hidden sm:inline">Help</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container py-4">
        <div className="flex items-center gap-4 lg:gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xl text-slate-900">Duuka</span>
              <span className="font-bold text-xl text-emerald-600">Africa</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <div className="relative flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-r-none border-r-0 px-3 hidden sm:flex">
                    All <ChevronRight className="ml-1 h-4 w-4 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {headerCategories.map((cat) => (
                    <DropdownMenuItem key={cat.href} asChild>
                      <Link href={cat.href} className="cursor-pointer">
                        <span className="mr-2">{cat.icon}</span> {cat.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                type="search"
                placeholder="Search products, brands, categories..."
                className="rounded-l-none sm:rounded-l-none flex-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" className="rounded-l-none bg-slate-900 hover:bg-slate-800">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            <Link href="/wishlist" className="hidden sm:flex flex-col items-center text-sm hover:text-slate-900">
              <Heart className="h-5 w-5" />
              <span className="hidden lg:inline text-xs">Wishlist</span>
            </Link>

            <Link href="/cart" className="flex flex-col items-center text-sm hover:text-slate-900 relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden lg:inline text-xs">Cart</span>
              <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                0
              </Badge>
            </Link>

            {!isSignedIn ? (
              <SignInButton mode="modal">
                <Button variant="ghost" className="flex flex-col items-center">
                  <User className="h-5 w-5" />
                  <span className="hidden lg:inline text-xs">Sign In</span>
                </Button>
              </SignInButton>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <UserButton afterSignOutUrl="/" />
                    <span className="hidden lg:inline text-sm">Account</span>
                    <ChevronRight className="h-4 w-4 rotate-90 hidden lg:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/wishlist" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/seller/dashboard" className="cursor-pointer">
                      <Store className="mr-2 h-4 w-4" />
                      Seller Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Categories Nav */}
      <nav className="border-t bg-gray-50 hidden md:block">
        <div className="container">
          <ul className="flex items-center gap-6 py-2 text-sm overflow-x-auto">
            {headerCategories.map((cat) => (
              <li key={cat.href}>
                <Link 
                  href={cat.href} 
                  className="flex items-center gap-1.5 hover:text-slate-900 whitespace-nowrap"
                >
                  <span>{cat.icon}</span> {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}

// ============================================
// FOOTER COMPONENT
// ============================================

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="border-b border-gray-800">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Subscribe to our Newsletter</h3>
              <p className="text-sm text-gray-400">Get the latest deals and offers directly in your inbox</p>
            </div>
            <form className="flex w-full md:w-auto gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-full md:w-64"
              />
              <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 whitespace-nowrap border border-gray-700">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">D</span>
              </div>
              <div>
                <span className="font-bold text-xl text-white">Duuka</span>
                <span className="font-bold text-xl text-emerald-500">Africa</span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              East Africa's Trusted Marketplace. Shop millions of products from verified sellers across Uganda, Kenya, Tanzania, and Rwanda.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/categories/electronics" className="hover:text-white">Electronics</Link></li>
              <li><Link href="/categories/fashion" className="hover:text-white">Fashion</Link></li>
              <li><Link href="/categories/home-garden" className="hover:text-white">Home & Garden</Link></li>
              <li><Link href="/categories/beauty" className="hover:text-white">Beauty</Link></li>
              <li><Link href="/categories/sports" className="hover:text-white">Sports</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
              <li><Link href="/track-order" className="hover:text-white">Track Order</Link></li>
              <li><Link href="/returns" className="hover:text-white">Returns & Refunds</Link></li>
              <li><Link href="/shipping" className="hover:text-white">Shipping Info</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Sell on DuukaAfrica</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/seller" className="hover:text-white">Start Selling</Link></li>
              <li><Link href="/seller/login" className="hover:text-white">Seller Login</Link></li>
              <li><Link href="/seller/guidelines" className="hover:text-white">Seller Guidelines</Link></li>
              <li><Link href="/seller/fees" className="hover:text-white">Fees & Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Kampala, Uganda</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <span>+256 700 123 456</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <span>support@duukaafrica.com</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <p>© {new Date().getFullYear()} DuukaAfrica. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Import Phone icon
function Phone({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
}

// ============================================
// HERO SECTION
// ============================================

export function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-700 text-white overflow-hidden">
      <div className="container relative py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
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
              <Button size="lg" className="bg-white text-slate-900 hover:bg-gray-100 text-lg px-8">
                Start Shopping
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                Sell on DuukaAfrica
              </Button>
            </div>

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

          <div className="hidden lg:block relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 transform hover:scale-105 transition-transform">
                  <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop" alt="Electronics" className="rounded-xl w-full h-40 object-cover" />
                  <p className="mt-2 font-medium">Electronics</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 transform hover:scale-105 transition-transform">
                  <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=300&fit=crop" alt="Fashion" className="rounded-xl w-full h-32 object-cover" />
                  <p className="mt-2 font-medium">Fashion</p>
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 transform hover:scale-105 transition-transform">
                  <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop" alt="Home" className="rounded-xl w-full h-32 object-cover" />
                  <p className="mt-2 font-medium">Home & Living</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 transform hover:scale-105 transition-transform">
                  <img src="https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&h=300&fit=crop" alt="Sneakers" className="rounded-xl w-full h-40 object-cover" />
                  <p className="mt-2 font-medium">Footwear</p>
                </div>
              </div>
            </div>
          </div>
        </div>

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

// ============================================
// CATEGORIES SECTION
// ============================================

const categories = [
  { name: "Electronics", slug: "electronics", icon: "📱", count: "15,000+", color: "bg-blue-50" },
  { name: "Fashion", slug: "fashion", icon: "👗", count: "25,000+", color: "bg-pink-50" },
  { name: "Home & Garden", slug: "home-garden", icon: "🏠", count: "8,000+", color: "bg-green-50" },
  { name: "Beauty & Health", slug: "beauty-health", icon: "💄", count: "12,000+", color: "bg-purple-50" },
  { name: "Sports & Outdoors", slug: "sports", icon: "⚽", count: "5,000+", color: "bg-orange-50" },
  { name: "Vehicles", slug: "vehicles", icon: "🚗", count: "3,000+", color: "bg-yellow-50" },
  { name: "Real Estate", slug: "real-estate", icon: "🏢", count: "1,500+", color: "bg-indigo-50" },
  { name: "Groceries", slug: "groceries", icon: "🛒", count: "10,000+", color: "bg-emerald-50" },
];

export function CategoriesSection() {
  return (
    <section className="py-12 bg-white">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Shop by Category</h2>
            <p className="text-gray-500 mt-1">Browse our wide selection of categories</p>
          </div>
          <Link href="/categories" className="text-slate-900 font-medium flex items-center hover:underline">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((category) => (
            <Link key={category.slug} href={`/categories/${category.slug}`} className="group">
              <div className={`${category.color} rounded-2xl p-4 text-center transition-all group-hover:shadow-lg group-hover:-translate-y-1`}>
                <div className="text-4xl mb-2">{category.icon}</div>
                <h3 className="font-semibold text-sm">{category.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{category.count} items</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FLASH DEALS
// ============================================

const flashDeals = [
  { id: 1, name: "iPhone 15 Pro Max 256GB", originalPrice: 4500000, salePrice: 3899000, discount: 13, image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=300&h=300&fit=crop", sold: 45, total: 100, endTime: new Date(Date.now() + 5 * 60 * 60 * 1000) },
  { id: 2, name: "Samsung Galaxy S24 Ultra", originalPrice: 4200000, salePrice: 3599000, discount: 14, image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=300&h=300&fit=crop", sold: 78, total: 100, endTime: new Date(Date.now() + 3 * 60 * 60 * 1000) },
  { id: 3, name: "Sony WH-1000XM5 Headphones", originalPrice: 1200000, salePrice: 899000, discount: 25, image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=300&h=300&fit=crop", sold: 92, total: 150, endTime: new Date(Date.now() + 2 * 60 * 60 * 1000) },
  { id: 4, name: "MacBook Air M2 13\"", originalPrice: 5500000, salePrice: 4799000, discount: 13, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=300&fit=crop", sold: 23, total: 50, endTime: new Date(Date.now() + 8 * 60 * 60 * 1000) },
  { id: 5, name: "Nike Air Jordan 1 Retro", originalPrice: 650000, salePrice: 459000, discount: 29, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop", sold: 156, total: 200, endTime: new Date(Date.now() + 1 * 60 * 60 * 1000) },
];

function formatTime(date: Date) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

export function FlashDeals() {
  const [timeLeft, setTimeLeft] = useState<{ [key: number]: { hours: number; minutes: number; seconds: number } }>({});

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft: { [key: number]: { hours: number; minutes: number; seconds: number } } = {};
      flashDeals.forEach((deal) => { newTimeLeft[deal.id] = formatTime(deal.endTime); });
      setTimeLeft(newTimeLeft);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('flash-deals-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-12 bg-gradient-to-r from-red-500 to-orange-500">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <Flame className="h-8 w-8 animate-pulse" />
              <h2 className="text-2xl md:text-3xl font-bold">Flash Deals</h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 text-white">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-bold">
                {String(Object.values(timeLeft)[0]?.hours || 0).padStart(2, '0')}:
                {String(Object.values(timeLeft)[0]?.minutes || 0).padStart(2, '0')}:
                {String(Object.values(timeLeft)[0]?.seconds || 0).padStart(2, '0')}
              </span>
              <span className="text-sm">left</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={() => scroll('left')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="bg-white/20 border-white/30 text-white hover:bg-white/30" onClick={() => scroll('right')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div id="flash-deals-container" className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {flashDeals.map((deal) => (
            <Link key={deal.id} href={`/products/${deal.id}`} className="min-w-[220px] flex-shrink-0">
              <Card className="overflow-hidden hover:shadow-xl transition-shadow bg-white">
                <div className="relative">
                  <img src={deal.image} alt={deal.name} className="w-full h-40 object-cover" />
                  <Badge className="absolute top-2 left-2 bg-red-500">-{deal.discount}%</Badge>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 mb-2">{deal.name}</h3>
                  <span className="text-lg font-bold text-red-500">USh {deal.salePrice.toLocaleString()}</span>
                  <div className="text-xs text-gray-400 line-through">USh {deal.originalPrice.toLocaleString()}</div>
                  <div className="mt-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full" style={{ width: `${(deal.sold / deal.total) * 100}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{deal.sold} sold of {deal.total}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FEATURED PRODUCTS
// ============================================

const featuredProducts = [
  { id: 1, name: "iPhone 15 Pro Max 256GB - Natural Titanium", price: 4500000, originalPrice: 5000000, rating: 4.8, reviews: 256, image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=400&fit=crop", store: "Apple Store Uganda", isVerified: true },
  { id: 2, name: "Samsung 65\" Crystal UHD 4K Smart TV", price: 2800000, originalPrice: 3200000, rating: 4.6, reviews: 189, image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=400&fit=crop", store: "Samsung Brand Store", isVerified: true },
  { id: 3, name: "Nike Air Force 1 '07 - White", price: 380000, originalPrice: 450000, rating: 4.9, reviews: 423, image: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400&h=400&fit=crop", store: "Sneaker Hub", isVerified: true },
  { id: 4, name: "PlayStation 5 Console + 2 Controllers", price: 2200000, originalPrice: 2500000, rating: 4.7, reviews: 312, image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop", store: "Game Zone", isVerified: true },
  { id: 5, name: "Dell XPS 15 Laptop - Intel i7, 16GB RAM", price: 4200000, originalPrice: 4800000, rating: 4.5, reviews: 98, image: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop", store: "Tech World", isVerified: true },
  { id: 6, name: "JBL PartyBox 710 - Portable Speaker", price: 1800000, originalPrice: 2100000, rating: 4.8, reviews: 167, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop", store: "Sound Masters", isVerified: true },
  { id: 7, name: "Adidas Originals Superstar - Black/White", price: 320000, originalPrice: 380000, rating: 4.7, reviews: 289, image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop", store: "Sneaker Hub", isVerified: true },
  { id: 8, name: "Canon EOS R50 Mirrorless Camera Kit", price: 3500000, originalPrice: 4000000, rating: 4.9, reviews: 56, image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop", store: "Camera World", isVerified: true },
];

export function FeaturedProducts() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
            <p className="text-gray-500 mt-1">Top picks from verified sellers</p>
          </div>
          <Link href="/products/featured" className="text-slate-900 font-medium flex items-center hover:underline">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="h-full overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="relative overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300" />
                  {product.originalPrice > product.price && (
                    <Badge className="absolute top-2 left-2 bg-red-500">
                      -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                    </Badge>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <span>{product.store}</span>
                    {product.isVerified && <Badge variant="secondary" className="h-4 px-1 text-[10px]">✓</Badge>}
                  </div>
                  <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-slate-900 transition-colors">{product.name}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < Math.floor(product.rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                    ))}
                    <span className="text-xs text-gray-500">({product.reviews})</span>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-lg font-bold text-slate-900">USh {product.price.toLocaleString()}</span>
                    {product.originalPrice > product.price && (
                      <span className="text-xs text-gray-400 line-through">USh {product.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  <Button size="sm" className="w-full mt-3 bg-slate-900 hover:bg-slate-800">
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

// ============================================
// STORES SECTION
// ============================================

const stores = [
  { id: 1, name: "Apple Store Uganda", logo: "https://images.unsplash.com/photo-1621768216002-5ac171876625?w=100&h=100&fit=crop", banner: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=200&fit=crop", rating: 4.9, products: 156, followers: 12500, isVerified: true, isTopSeller: true, category: "Electronics" },
  { id: 2, name: "Fashion Hub", logo: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop", banner: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=200&fit=crop", rating: 4.8, products: 892, followers: 23400, isVerified: true, isTopSeller: true, category: "Fashion" },
  { id: 3, name: "Tech World", logo: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop", banner: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=200&fit=crop", rating: 4.7, products: 423, followers: 8900, isVerified: true, isTopSeller: false, category: "Electronics" },
  { id: 4, name: "Home Essentials", logo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop", banner: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=200&fit=crop", rating: 4.6, products: 678, followers: 15600, isVerified: true, isTopSeller: true, category: "Home & Garden" },
];

export function StoresSection() {
  return (
    <section className="py-12 bg-white">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Top Verified Stores</h2>
            <p className="text-gray-500 mt-1">Shop from trusted sellers with excellent ratings</p>
          </div>
          <Link href="/stores" className="text-slate-900 font-medium flex items-center hover:underline">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stores.map((store) => (
            <Link key={store.id} href={`/stores/${store.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <div className="relative h-24 bg-gray-100">
                  <img src={store.banner} alt={store.name} className="w-full h-full object-cover" />
                  <div className="absolute -bottom-8 left-4">
                    <div className="w-16 h-16 rounded-xl border-4 border-white bg-white overflow-hidden shadow-lg">
                      <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  {store.isTopSeller && <Badge className="absolute top-2 right-2 bg-yellow-500 text-xs">Top Seller</Badge>}
                </div>
                <CardContent className="pt-12 pb-4 px-4">
                  <h3 className="font-semibold group-hover:text-slate-900 transition-colors">{store.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                    <span>{store.category}</span>
                    {store.isVerified && <Badge variant="secondary" className="h-4 px-1 text-[10px]">✓ Verified</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-medium">{store.rating}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">{store.products} products</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Store className="h-4 w-4 mr-2" />
                    Visit Store
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-slate-900 to-emerald-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">Start Selling on DuukaAfrica</h3>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">Join thousands of successful sellers across East Africa. Reach millions of customers.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/seller/register"><Button size="lg" className="bg-white text-slate-900 hover:bg-gray-100">Start Selling Free</Button></Link>
            <Link href="/seller/learn-more"><Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">Learn More</Button></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// WHY CHOOSE US
// ============================================

const features = [
  { icon: Truck, title: "Fast Delivery", description: "Get your orders delivered within 24-48 hours in major cities across East Africa.", color: "bg-blue-100 text-blue-600" },
  { icon: Shield, title: "Buyer Protection", description: "Your payments are protected until you receive and confirm your order.", color: "bg-green-100 text-green-600" },
  { icon: CreditCard, title: "Secure Payments", description: "Pay safely with Mobile Money (M-Pesa, MTN, Airtel), cards, or bank transfer.", color: "bg-purple-100 text-purple-600" },
  { icon: BadgeCheck, title: "Verified Sellers", description: "All sellers are verified and vetted for quality and reliability.", color: "bg-orange-100 text-orange-600" },
  { icon: RefreshCcw, title: "Easy Returns", description: "Return products within 7 days for a full refund. No questions asked.", color: "bg-red-100 text-red-600" },
  { icon: Headphones, title: "24/7 Support", description: "Our support team is available round the clock via chat, phone, or email.", color: "bg-teal-100 text-teal-600" },
];

export function WhyChooseUs() {
  return (
    <section className="py-12 bg-gray-50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Why Shop on DuukaAfrica?</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">We&apos;re committed to providing the best shopping experience for customers across East Africa.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// APP DOWNLOAD
// ============================================

export function AppDownload() {
  return (
    <section className="py-12 bg-white">
      <div className="container">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="p-8 lg:p-12 text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Shop Anywhere, Anytime</h2>
              <p className="text-gray-300 text-lg mb-6">Download the DuukaAfrica app for the best shopping experience. Get exclusive deals and track orders in real-time!</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs">✓</div>
                  <span>Exclusive app-only discounts up to 50% off</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs">✓</div>
                  <span>Real-time order tracking with notifications</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs">✓</div>
                  <span>Faster checkout with saved preferences</span>
                </li>
              </ul>
              <div className="flex flex-wrap gap-4">
                <a href="#" className="inline-flex items-center gap-3 bg-white text-gray-900 px-5 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  <div className="text-left"><div className="text-xs text-gray-500">Download on the</div><div className="font-semibold">App Store</div></div>
                </a>
                <a href="#" className="inline-flex items-center gap-3 bg-white text-gray-900 px-5 py-3 rounded-xl hover:bg-gray-100 transition-colors">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 9.99l-2.302 2.302-8.634-8.634z"/></svg>
                  <div className="text-left"><div className="text-xs text-gray-500">GET IT ON</div><div className="font-semibold">Google Play</div></div>
                </a>
              </div>
            </div>
            <div className="hidden lg:flex justify-center items-end py-8 pr-8">
              <div className="w-64 h-[500px] bg-gray-800 rounded-[40px] p-2 shadow-2xl border-4 border-gray-700">
                <div className="w-full h-full bg-gradient-to-b from-slate-900 to-emerald-600 rounded-[32px] flex flex-col items-center justify-center text-white">
                  <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-4">
                    <span className="text-slate-900 font-bold text-2xl">D</span>
                  </div>
                  <div className="text-xl font-bold">DuukaAfrica</div>
                  <div className="text-sm opacity-80 mt-1">Your Shop, Your Way</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
