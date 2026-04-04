export default function ProductsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        ))}
      </div>

      {/* Product grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
