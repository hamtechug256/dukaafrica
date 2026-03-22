'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  User, 
  MapPin,
  ChevronDown,
  Store,
  Package,
  Settings,
  LayoutDashboard
} from "lucide-react";
import { useState, useEffect } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { useCartStore } from "@/store/cart-store";

const categories = [
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
  const { getItemCount } = useCartStore();
  const cartCount = getItemCount();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSeller, setIsSeller] = useState(false);

  // Check user role on mount
  useEffect(() => {
    async function checkUserRole() {
      if (!isSignedIn) {
        setIsAdmin(false);
        setIsSeller(false);
        return;
      }
      
      try {
        const response = await fetch('/api/user/role');
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.user?.isAdmin || false);
          setIsSeller(data.user?.isSeller || false);
        }
      } catch (error) {
        console.error('Failed to check user role:', error);
      }
    }
    
    checkUserRole();
  }, [isSignedIn]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-1.5 text-sm">
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
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-xl text-primary">Duuka</span>
              <span className="font-bold text-xl text-emerald-600">Africa</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl">
            <form action="/search" method="GET" className="relative flex">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-r-none border-r-0 px-3 hidden sm:flex">
                    All <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {categories.map((cat) => (
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
                name="q"
                placeholder="Search products, brands, categories..."
                className="rounded-l-none sm:rounded-l-none flex-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button type="submit" className="rounded-l-none bg-primary hover:bg-primary/90">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Wishlist */}
            <Link href="/dashboard/wishlist" className="hidden sm:flex flex-col items-center text-sm hover:text-primary">
              <Heart className="h-5 w-5" />
              <span className="hidden lg:inline text-xs">Wishlist</span>
            </Link>

            {/* Cart */}
            <Link href="/cart" className="flex flex-col items-center text-sm hover:text-primary relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden lg:inline text-xs">Cart</span>
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </Badge>
              )}
            </Link>

            {/* User Menu */}
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
                    <UserButton />
                    <span className="hidden lg:inline text-sm">Account</span>
                    <ChevronDown className="h-4 w-4 hidden lg:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/orders" className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/wishlist" className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isSeller && (
                    <DropdownMenuItem asChild>
                      <Link href="/seller/dashboard" className="cursor-pointer">
                        <Store className="mr-2 h-4 w-4" />
                        Seller Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/addresses" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Categories Nav */}
      <nav className="border-t bg-gray-50 hidden md:block">
        <div className="container">
          <ul className="flex items-center gap-6 py-2 text-sm overflow-x-auto">
            {categories.map((cat) => (
              <li key={cat.href}>
                <Link 
                  href={cat.href} 
                  className="flex items-center gap-1.5 hover:text-primary whitespace-nowrap"
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
