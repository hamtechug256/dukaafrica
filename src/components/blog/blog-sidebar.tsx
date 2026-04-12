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
        category: { select: { name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    }),
  ])

  return (
    <aside className="space-y-6">
      {/* Categories */}
      {categories.length > 0 && (
        <div className="rounded-2xl border border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.25_0.02_45)] bg-white dark:bg-[oklch(0.15_0.02_45)] p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm uppercase tracking-wider">Categories</h3>
          <ul className="space-y-1">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/blog/category/${cat.slug}`}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-[oklch(0.96_0.01_85)] dark:hover:bg-[oklch(0.2_0.02_45)] hover:text-gray-900 dark:hover:text-gray-100 transition-colors group"
                >
                  <span className="font-medium">{cat.name}</span>
                  <Badge variant="secondary" className="text-xs font-medium bg-[oklch(0.95_0.01_85)] dark:bg-[oklch(0.2_0.02_45)] border-0">
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
        <div className="rounded-2xl border border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.25_0.02_45)] bg-white dark:bg-[oklch(0.15_0.02_45)] p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm uppercase tracking-wider">Popular Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/blog/tag/${tag.slug}`}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.2_0.02_45)] text-gray-600 dark:text-gray-400 hover:bg-[oklch(0.6_0.2_35)] hover:text-white transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      {recentPosts.length > 0 && (
        <div className="rounded-2xl border border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.25_0.02_45)] bg-white dark:bg-[oklch(0.15_0.02_45)] p-5">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 text-sm uppercase tracking-wider">Recent Posts</h3>
          <ul className="space-y-4">
            {recentPosts.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex gap-3 group"
                >
                  <div className="w-16 h-14 rounded-xl overflow-hidden shrink-0 bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.2_0.02_45)]">
                    {post.coverImage ? (
                      <img src={post.coverImage} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[oklch(0.7_0.05_35)] text-xs">📝</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-[oklch(0.55_0.18_35)] transition-colors leading-snug">
                      {post.title}
                    </p>
                    {post.publishedAt && (
                      <p className="text-xs text-gray-400 mt-1">
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
