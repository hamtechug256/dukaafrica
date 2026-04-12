import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, PenLine } from 'lucide-react'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { BlogSidebar } from '@/components/blog/blog-sidebar'

export const metadata: Metadata = {
  title: 'Blog - DuukaAfrica',
  description: "Read the latest articles, insights, and tips from DuukaAfrica. Stay updated with East Africa's trusted marketplace.",
  openGraph: {
    title: 'Blog - DuukaAfrica',
    description: "Read the latest articles, insights, and tips from DuukaAfrica.",
    type: 'website',
  },
  alternates: {
    canonical: 'https://duukaafrica.com/blog',
  },
}

const POSTS_PER_PAGE = 9

interface BlogPageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1'))
  const searchQuery = params.q?.trim() || ''

  const where: Record<string, unknown> = { status: 'PUBLISHED' }
  if (searchQuery) {
    where.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { excerpt: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }

  const [posts, total, featuredPost, categories] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
    }),
    prisma.blogPost.count({ where }),
    searchQuery
      ? null
      : prisma.blogPost.findFirst({
          where: { status: 'PUBLISHED', isFeatured: true },
          orderBy: { publishedAt: 'desc' },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            tags: { select: { id: true, name: true, slug: true } },
            author: { select: { id: true, name: true } },
          },
        }),
    prisma.blogCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { BlogPost: true } } },
      orderBy: { order: 'asc' },
    }),
  ])

  const totalPages = Math.ceil(total / POSTS_PER_PAGE)

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.005_85)] dark:bg-[oklch(0.1_0.01_45)]">
      {/* Hero Section */}
      <section
        className="text-white py-16 md:py-24"
        style={{ background: 'linear-gradient(135deg, oklch(0.45 0.2 35), oklch(0.4 0.15 40), oklch(0.35 0.12 50))' }}
      >
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm font-medium mb-6">
            <PenLine className="w-4 h-4" />
            DuukaAfrica Blog
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Stories, Insights & Tips
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Stay informed with the latest from East Africa&apos;s marketplace. Expert advice, seller stories, and market trends.
          </p>

          {/* Search Bar */}
          <form action="/blog/search" method="GET" className="max-w-lg mx-auto">
            <div className="relative flex rounded-2xl overflow-hidden shadow-2xl">
              <Input
                type="search"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search articles..."
                className="rounded-r-none h-12 text-foreground bg-white/95 backdrop-blur border-0 focus-visible:ring-0"
              />
              <Button
                type="submit"
                className="rounded-l-none h-12 px-6 bg-white/20 backdrop-blur hover:bg-white/30 text-white font-semibold"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-12">
        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-10">
            <Link
              href="/blog"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog/category/${cat.slug}`}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-[oklch(0.15_0.02_45)] text-gray-700 dark:text-gray-300 border border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.25_0.02_45)] hover:border-[oklch(0.6_0.2_35)] hover:text-[oklch(0.55_0.18_35)] transition-colors"
              >
                {cat.name}
                <span className="ml-1.5 text-xs opacity-50">{cat._count.BlogPost}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Left Column — Posts */}
          <div className="flex-1 min-w-0">
            {/* Featured Post */}
            {!searchQuery && featuredPost && page === 1 && (
              <div className="mb-10">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Featured Article</h2>
                <BlogPostCard post={featuredPost} featured />
              </div>
            )}

            {/* Posts Grid */}
            {posts.length > 0 ? (
              <>
                {searchQuery && (
                  <p className="text-sm text-gray-500 mb-6">
                    Showing {total} result{total !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {posts.map((post) => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Blog pagination">
                    {page > 1 && (
                      <Link
                        href={`/blog?page=${page - 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.25_0.02_45)] hover:bg-white dark:hover:bg-[oklch(0.15_0.02_45)] transition-colors"
                      >
                        Previous
                      </Link>
                    )}
                    <span className="px-4 py-2 text-sm text-gray-500">
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                      <Link
                        href={`/blog?page=${page + 1}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ''}`}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                        style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
                      >
                        Next
                      </Link>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.18_0.02_45)] flex items-center justify-center mb-5">
                  <PenLine className="w-8 h-8 text-[oklch(0.6_0.2_35)]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {searchQuery ? 'No articles found' : 'No articles yet'}
                </h3>
                <p className="text-sm text-gray-500 max-w-md">
                  {searchQuery
                    ? `We couldn't find articles matching "${searchQuery}". Try a different search.`
                    : 'Check back soon — we\'re working on exciting content for you!'}
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0">
            <BlogSidebar />
          </div>
        </div>
      </section>
    </main>
  )
}
