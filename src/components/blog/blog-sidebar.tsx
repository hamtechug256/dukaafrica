import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'

export async function BlogSidebar() {
  const [categories, tags, recentPosts] = await Promise.all([
    prisma.blogCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { BlogPost: true } } },
      orderBy: { order: 'asc' },
    }),
    prisma.blogTag.findMany({
      where: {
        BlogPost: { some: { status: 'PUBLISHED' } },
      },
      include: { _count: { select: { BlogPost: true } } },
      orderBy: { BlogPost: { _count: 'desc' } },
      take: 15,
    }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    }),
  ])

  return (
    <aside className="space-y-8">
      {/* Categories */}
      {categories.length > 0 && (
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Categories</h3>
          <ul className="space-y-2">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/blog/category/${cat.slug}`}
                  className="flex items-center justify-between py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  <span>{cat.name}</span>
                  <Badge variant="secondary" className="text-xs font-normal ml-2">
                    {cat._count.BlogPost}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Popular Tags */}
      {tags.length > 0 && (
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Popular Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/blog/tag/${tag.slug}`}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <div className="rounded-xl border bg-white dark:bg-gray-900 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Posts</h3>
          <ul className="space-y-3">
            {recentPosts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex gap-3 group"
                >
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                    {post.coverImage ? (
                      <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/20 text-xs">📝</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </p>
                    {post.publishedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
