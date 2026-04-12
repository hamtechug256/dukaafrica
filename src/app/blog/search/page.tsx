import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Search, PenLine } from 'lucide-react'
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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="bg-gradient-to-br from-primary/5 to-primary/10 border-b">
        <div className="container py-12 md:py-16">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-primary">Blog</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100">Search</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Search Articles
          </h1>
          <form action="/blog/search" method="GET" className="max-w-lg">
            <div className="relative flex">
              <Input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search articles..."
                className="rounded-r-none h-12"
              />
              <Button type="submit" className="rounded-l-none h-12 px-6">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="container py-12">
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
                      <Link href={`/blog/search?q=${encodeURIComponent(query)}&page=${page - 1}`} className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Previous</Link>
                    )}
                    <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {totalPages}</span>
                    {page < totalPages && (
                      <Link href={`/blog/search?q=${encodeURIComponent(query)}&page=${page + 1}`} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Next</Link>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <PenLine className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
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
