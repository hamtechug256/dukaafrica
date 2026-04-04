export default function CheckoutLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Steps skeleton */}
      <div className="flex justify-center gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse hidden sm:block" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
