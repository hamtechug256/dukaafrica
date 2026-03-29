'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flame, ChevronLeft, ChevronRight, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface FlashDeal {
  id: string;
  name: string;
  slug: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  image: string | null;
  sold: number;
  total: number;
  endTime: Date | string;
  store: { id: string; name: string; slug: string };
  category: { id: string; name: string; slug: string } | null;
  currency: string;
}

async function fetchFlashDeals() {
  const res = await fetch('/api/flash-sales?limit=10');
  if (!res.ok) throw new Error('Failed to fetch flash deals');
  return res.json();
}

function formatTime(endTime: Date | string) {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
}

export function FlashDeals() {
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: { hours: number; minutes: number; seconds: number } }>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['flash-deals'],
    queryFn: fetchFlashDeals,
    refetchInterval: 60000, // Refresh every minute
  });

  const flashDeals: FlashDeal[] = data?.flashDeals || [];

  useEffect(() => {
    if (flashDeals.length === 0) return;

    const timer = setInterval(() => {
      const newTimeLeft: { [key: string]: { hours: number; minutes: number; seconds: number } } = {};
      flashDeals.forEach((deal) => {
        newTimeLeft[deal.id] = formatTime(deal.endTime);
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [flashDeals]);

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('flash-deals-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Don't render section if no active flash deals
  if (!isLoading && flashDeals.length === 0) {
    return null;
  }

  // Get the first deal's time for the main countdown
  const mainCountdown = flashDeals[0] ? timeLeft[flashDeals[0].id] : { hours: 0, minutes: 0, seconds: 0 };

  return (
    <section className="py-12 bg-gradient-to-r from-red-500 to-orange-500">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <Flame className="h-8 w-8 animate-pulse" />
              <h2 className="text-2xl md:text-3xl font-bold">Flash Deals</h2>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 text-white">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-bold">
                {String(mainCountdown.hours).padStart(2, '0')}:
                {String(mainCountdown.minutes).padStart(2, '0')}:
                {String(mainCountdown.seconds).padStart(2, '0')}
              </span>
              <span className="text-sm">remaining</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/products?flashSale=true" className="hidden sm:block">
              <Button variant="outline" className="bg-white/20 border-white/30 text-white hover:bg-white/30">
                View All
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12 text-white">
            <p>Unable to load flash deals. Please try again later.</p>
          </div>
        )}

        {/* Products Scroll */}
        {!isLoading && !error && (
          <div 
            id="flash-deals-container"
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {flashDeals.map((deal) => (
              <Link key={deal.id} href={`/products/${deal.slug}`} className="min-w-[220px] flex-shrink-0">
                <Card className="overflow-hidden hover:shadow-xl transition-shadow bg-white">
                  <div className="relative h-40 bg-gray-100">
                    {deal.image ? (
                      <img 
                        src={deal.image} 
                        alt={deal.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-red-500">
                      -{deal.discount}%
                    </Badge>
                    {/* Mini countdown */}
                    {timeLeft[deal.id] && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeLeft[deal.id].hours}h {timeLeft[deal.id].minutes}m
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm line-clamp-2 mb-2">{deal.name}</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-red-500">
                        {deal.currency} {deal.salePrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 line-through">
                      {deal.currency} {deal.originalPrice.toLocaleString()}
                    </div>
                    {deal.store && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        by {deal.store.name}
                      </p>
                    )}
                    {/* Progress bar */}
                    {deal.total > 0 && (
                      <div className="mt-3">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                            style={{ width: `${Math.min((deal.sold / deal.total) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {deal.sold} sold of {deal.total}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
