import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { BlogSidebar } from '@/components/blog/blog-sidebar'

const POSTS_PER_PAGE = 9

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await prisma.blogCategory.findUnique({
    where: { slug, isActive: true },
    select: { name: true, description: true },
  })
  if (!category) return { title: 'Category Not Found' }

  return {
    title: `${category.name} - DuukaAfrica Blog`,
    description: category.description || `Browse all ${category.name} articles on the DuukaAfrica blog.`,
    alternates: { canonical: `https://duukaafrica.com/blog/category/${slug}` },
  }
}

export default async function BlogCategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const resolvedParams = await searchParams
  const page = Math.max(1, parseInt(resolvedParams.page || '1'))

  const category = await prisma.blogCategory.findUnique({
    where: { slug, isActive: true },
  })

  if (!category) notFound()

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED', categoryId: category.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, name: true } },
      },
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * POSTS_PER_PAGE,
      take: POSTS_PER_PAGE,
    }),
    prisma.blogPost.count({ where: { status: 'PUBLISHED', categoryId: category.id } }),
  ])

  const totalPages = Math.ceil(total / POSTS_PER_PAGE)

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Category Header */}
      <section className="bg-gradient-to-br from-primary/5 to-primary/10 border-b">
        <div className="container py-12 md:py-16">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-primary">Blog</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-100">{category.name}</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              {category.description}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-3">
            {total} article{total !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      <section className="container py-12">
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
                      <Link href={`/blog/category/${slug}?page=${page - 1}`} className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Previous</Link>
                    )}
                    <span className="px-4 py-2 text-sm text-gray-500">Page {page} of {totalPages}</span>
                    {page < totalPages && (
                      <Link href={`/blog/category/${slug}?page=${page + 1}`} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Next</Link>
                    )}
                  </nav>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <PenLine className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No articles in this category</h3>
                <p className="text-sm text-gray-500">Check back soon or browse other categories.</p>
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
