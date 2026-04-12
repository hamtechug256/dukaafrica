import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { PenLine, ArrowLeft } from 'lucide-react'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { BlogSidebar } from '@/components/blog/blog-sidebar'

const POSTS_PER_PAGE = 9

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tag = await prisma.blogTag.findUnique({ where: { slug } })
  if (!tag) return { title: 'Tag Not Found' }

  return {
    title: `#${tag.name} - DuukaAfrica Blog`,
    description: `Browse articles tagged with "${tag.name}" on the DuukaAfrica blog.`,
    alternates: { canonical: `https://duukaafrica.com/blog/tag/${slug}` },
  }
}

export default async function BlogTagPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const resolvedParams = await searchParams
  const page = Math.max(1, parseInt(resolvedParams.page || '1'))

  const tag = await prisma.blogTag.findUnique({ where: { slug } })
  if (!tag) notFound()

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED', tags: { some: { id: tag.id } } },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
    }),
    prisma.blogPost.count({ where: { status: 'PUBLISHED', tags: { some: { id: tag.id } } } }),
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
            <span className="text-gray-900 dark:text-gray-100">#{tag.name}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            #{tag.name}
          </h1>
          <p className="text-sm text-gray-500 mt-3">
            {total} article{total !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0">
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
                      <Link href={`/blog/tag/${slug}?page=${page - 1}`} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.25_0.02_45)] hover:bg-white dark:hover:bg-[oklch(0.15_0.02_45)] transition-colors">Previous</Link>
                    )}
                    <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {totalPages}</span>
                    {page < totalPages && (
                      <Link href={`/blog/tag/${slug}?page=${page + 1}`} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}>Next</Link>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.18_0.02_45)] flex items-center justify-center mb-5">
                  <PenLine className="w-8 h-8 text-[oklch(0.6_0.2_35)]" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">No articles with this tag</h3>
                <p className="text-sm text-gray-500">Check back soon or browse other tags.</p>
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
