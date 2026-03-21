import Link from "next/link";
import { ArrowRight } from "lucide-react";

const categories = [
  { 
    name: "Electronics", 
    slug: "electronics",
    icon: "📱",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop",
    count: "15,000+",
    color: "bg-blue-50"
  },
  { 
    name: "Fashion", 
    slug: "fashion",
    icon: "👗",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop",
    count: "25,000+",
    color: "bg-pink-50"
  },
  { 
    name: "Home & Garden", 
    slug: "home-garden",
    icon: "🏠",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop",
    count: "8,000+",
    color: "bg-green-50"
  },
  { 
    name: "Beauty & Health", 
    slug: "beauty-health",
    icon: "💄",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop",
    count: "12,000+",
    color: "bg-purple-50"
  },
  { 
    name: "Sports & Outdoors", 
    slug: "sports",
    icon: "⚽",
    image: "https://images.unsplash.com/photo-1461896836934- voices?w=200&h=200&fit=crop",
    count: "5,000+",
    color: "bg-orange-50"
  },
  { 
    name: "Vehicles", 
    slug: "vehicles",
    icon: "🚗",
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop",
    count: "3,000+",
    color: "bg-yellow-50"
  },
  { 
    name: "Real Estate", 
    slug: "real-estate",
    icon: "🏢",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&h=200&fit=crop",
    count: "1,500+",
    color: "bg-indigo-50"
  },
  { 
    name: "Groceries", 
    slug: "groceries",
    icon: "🛒",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop",
    count: "10,000+",
    color: "bg-emerald-50"
  },
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
          <Link 
            href="/categories" 
            className="text-primary font-medium flex items-center hover:underline"
          >
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="group"
            >
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
