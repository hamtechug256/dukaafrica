export default function ProductDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image gallery skeleton */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="flex gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        </div>

        {/* Product info skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mt-6" />
        </div>
      </div>
    </div>
  )
}
