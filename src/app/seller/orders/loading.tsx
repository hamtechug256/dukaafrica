export default function SellerOrdersLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        ))}
      </div>

      {/* Orders table skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 dark:bg-gray-800 border-b">
          {['Order', 'Customer', 'Amount', 'Status', 'Date'].map((h) => (
            <div key={h} className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 p-4 border-b last:border-0">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
