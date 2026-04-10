'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Menu,
  MapPin,
  ChevronDown,
  Store,
  Package,
  Settings,
  LayoutDashboard,
  Shield,
  LogOut
} from "lucide-react";
import { useAuth, SignInButton, useClerk } from "@clerk/nextjs";
import { useCartStore } from "@/store/cart-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { COUNTRY_INFO } from "@/lib/currency";

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

interface UserRole {
  role: string;
  isAdmin: boolean;
  isSeller: boolean;
  isSuperAdmin: boolean;
}

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const { getItemCount } = useCartStore();
  const cartCount = getItemCount();
  
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string | null>(null);

  // Fetch user role when signed in
  useEffect(() => {
    async function fetchUserRole() {
      if (isSignedIn) {
        try {
          setRoleLoading(true);
          const res = await fetch('/api/user/role');
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUserRole({
                role: data.user.role,
                isAdmin: data.user.isAdmin,
                isSeller: data.user.isSeller,
                isSuperAdmin: data.user.isSuperAdmin,
              });
              setUserCountry(data.user.country || null);
            }
          }
        } catch (error) {
          console.error('Failed to fetch user role:', error);
        } finally {
          setRoleLoading(false);
        }
      } else {
        setUserRole(null);
        setRoleLoading(false);
      }
    }

    if (isLoaded) {
      fetchUserRole();
    }
  }, [isSignedIn, isLoaded]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  // Navigation items based on role
  const getUserNavItems = () => {
    const baseItems = [
      { label: 'My Dashboard', href: '/dashboard', icon: User },
      { label: 'My Orders', href: '/dashboard/orders', icon: Package },
      { label: 'Wishlist', href: '/dashboard/wishlist', icon: Heart },
      { label: 'Settings', href: '/dashboard/addresses', icon: Settings },
    ];

    const sellerItems = [
      { label: 'Seller Dashboard', href: '/seller/dashboard', icon: Store },
    ];

    const adminItems = [
      { label: 'Admin Panel', href: '/admin', icon: Shield },
    ];

    let items = [...baseItems];
    
    // Add seller dashboard for sellers
    if (userRole?.isSeller) {
      items = [...items.slice(0, 1), ...sellerItems, ...items.slice(1)];
    }
    
    // Add admin panel for admins
    if (userRole?.isAdmin) {
      items = [...items.slice(0, 2), ...adminItems, ...items.slice(2)];
    }

    return items;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 overflow-x-hidden">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-1.5 text-sm overflow-x-hidden">
        <div className="container flex items-center justify-between min-w-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Deliver to {userCountry ? COUNTRY_INFO[userCountry as keyof typeof COUNTRY_INFO]?.name || 'East Africa' : 'East Africa'}
            </span>
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">Free delivery on qualifying orders</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Show "Sell on DuukaAfrica" only for non-sellers, "Seller Dashboard" for sellers */}
            {!userRole?.isSeller ? (
              <Link href="/seller/register" className="hover:underline hidden sm:inline-flex items-center gap-1 whitespace-nowrap">
                <Store className="h-3.5 w-3.5" />
                Sell on DuukaAfrica
              </Link>
            ) : (
              <Link href="/seller/dashboard" className="hover:underline hidden sm:inline-flex items-center gap-1 whitespace-nowrap">
                <Store className="h-3.5 w-3.5" />
                Seller Dashboard
              </Link>
            )}
            <Link href="/help" className="hover:underline hidden sm:inline whitespace-nowrap">Help</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container py-4">
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
          {/* Mobile Menu Button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">D</span>
                  </div>
                  <span className="font-bold text-lg">Duuka<span className="text-emerald-600">Africa</span></span>
                </SheetTitle>
              </SheetHeader>
              <nav className="p-4 space-y-1 overflow-y-auto flex-1" aria-label="Mobile categories">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-2">Categories</p>
                {categories.map((cat) => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

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
              <Button type="submit" className="rounded-l-none bg-primary hover:bg-primary/90" aria-label="Search products">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Wishlist */}
            <Link href="/dashboard/wishlist" className="hidden sm:flex flex-col items-center text-sm hover:text-primary" aria-label="Wishlist">
              <Heart className="h-5 w-5" />
              <span className="hidden lg:inline text-xs">Wishlist</span>
            </Link>

            {/* Cart */}
            <Link href="/cart" className="flex items-center justify-center min-h-[44px] min-w-[44px] text-sm hover:text-primary relative" aria-label={cartCount > 0 ? `Cart with ${cartCount} items` : 'Cart'}>
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden lg:inline text-xs">Cart</span>
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary text-white" aria-hidden="true">
                  {cartCount > 99 ? '99+' : cartCount}
                </Badge>
              )}
            </Link>

            {/* User Menu */}
            {!isLoaded || roleLoading ? (
              <div className="w-11 h-11 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !isSignedIn ? (
              <SignInButton mode="modal">
                <Button variant="ghost" className="flex items-center justify-center min-h-[44px] min-w-[44px]" aria-label="Sign In">
                  <User className="h-5 w-5" />
                  <span className="hidden lg:inline text-xs">Sign In</span>
                </Button>
              </SignInButton>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="hidden lg:inline text-sm">Account</span>
                    <ChevronDown className="h-4 w-4 hidden lg:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Role Badge */}
                  {userRole && (
                    <div className="px-2 py-2 border-b">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        userRole.isSuperAdmin 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                          : userRole.isAdmin 
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : userRole.isSeller
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {userRole.isSuperAdmin && <Shield className="w-3 h-3" />}
                        {userRole.isSuperAdmin ? 'Super Admin' : userRole.isAdmin ? 'Admin' : userRole.isSeller ? 'Seller' : 'Buyer'}
                      </span>
                    </div>
                  )}

                  {/* Navigation Items - Role Based */}
                  {getUserNavItems().map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="cursor-pointer">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild className="text-red-600 focus:text-red-600">
                    <button onClick={handleSignOut} className="cursor-pointer w-full flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Categories Nav */}
      <nav className="border-t bg-gray-50 hidden md:block" aria-label="Product categories">
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
