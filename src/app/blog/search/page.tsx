import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Search, PenLine, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { BlogSidebar } from '@/components/blog/blog-sidebar'

export const metadata: Metadata = {
  title: 'Search Blog - DuukaAfrica',
  description: 'Search for articles on the DuukaAfrica blog.',
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function BlogSearchPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q?.trim() || ''
  const page = Math.max(1, parseInt(params.page || '1'))
  const POSTS_PER_PAGE = 12

  const where: Record<string, unknown> = { status: 'PUBLISHED' }
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { excerpt: { contains: query, mode: 'insensitive' } },
      { content: { contains: query, mode: 'insensitive' } },
    ]
  } else {
    where.id = 'never-match'
  }

  const [posts, total] = await Promise.all([
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
  ])

  const totalPages = Math.ceil(total / POSTS_PER_PAGE)

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.005_85)] dark:bg-[oklch(0.1_0.01_45)]">
      <section className="border-b border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[oklch(0.55_0.18_35)] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Link href="/" className="hover:text-[oklch(0.55_0.18_35)]">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[oklch(0.55_0.18_35)]">Blog</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100">Search</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Search Articles
          </h1>
          <form action="/blog/search" method="GET" className="max-w-lg">
            <div className="relative flex rounded-2xl overflow-hidden border border-[oklch(0.9_0.02_85)] dark:border-[oklch(0.25_0.02_45)] focus-within:border-[oklch(0.6_0.2_35)] focus-within:ring-2 focus-within:ring-[oklch(0.6_0.2_35)]/20 transition-all">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search articles..."
                className="rounded-r-none h-12 pl-12 border-0 focus-visible:ring-0 bg-transparent"
              />
              <Button
                type="submit"
                className="rounded-l-none h-12 px-6 text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
              >
                Search
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0">
            {query && (
              <p className="text-sm text-gray-500 mb-6">
                Showing {total} result{total !== 1 ? 's' : ''} for &quot;{query}&quot;
              </p>
            )}
            {posts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {posts.map((post) => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav className="flex items-center justify-center gap-2 mt-12" aria-label="Pagination">
                    {page > 1 && (
                      <Link href={`/blog/search?q=${encodeURIComponent(query)}&page=${page - 1}`} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.25_0.02_45)] hover:bg-white dark:hover:bg-[oklch(0.15_0.02_45)] transition-colors">Previous</Link>
                    )}
                    <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {totalPages}</span>
                    {page < totalPages && (
                      <Link href={`/blog/search?q=${encodeURIComponent(query)}&page=${page + 1}`} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}>Next</Link>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.18_0.02_45)] flex items-center justify-center mb-5">
                  <PenLine className="w-8 h-8 text-[oklch(0.6_0.2_35)]" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
                  {query ? 'No results found' : 'Enter a search term'}
                </h3>
                <p className="text-sm text-gray-500">
                  {query ? 'Try different keywords or browse our blog categories.' : 'Type something to search our blog articles.'}
                </p>
              </div>
            )}
          </div>
          <div className="w-full lg:w-80 shrink-0">
            <BlogSidebar />
          </div>
        </div>
      </section>
    </main>
  )
}
