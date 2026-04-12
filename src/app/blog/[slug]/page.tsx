import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { generateBlogPostMetadata, generateBlogPostSchema, generateBreadcrumbSchema } from '@/lib/seo'
import { BlogContentRenderer } from '@/components/blog/blog-content-renderer'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Eye, User, Facebook, Linkedin, Twitter, Share2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({
    where: { slug, status: 'PUBLISHED' },
    select: {
      title: true,
      slug: true,
      excerpt: true,
      metaTitle: true,
      metaDesc: true,
      coverImage: true,
      publishedAt: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  })
  if (!post) return { title: 'Post Not Found' }
  return generateBlogPostMetadata(post)
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await prisma.blogPost.findUnique({
    where: { slug, status: 'PUBLISHED' },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      tags: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, name: true } },
    },
  })

  if (!post) notFound()

  // Increment view count
  prisma.blogPost.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  // Related posts
  const relatedPosts = await prisma.blogPost.findMany({
    where: {
      status: 'PUBLISHED',
      id: { not: post.id },
      OR: post.categoryId
        ? [{ categoryId: post.categoryId }, { isFeatured: true }]
        : [{ isFeatured: true }],
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { id: true, name: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 3,
  })

  const articleSchema = generateBlogPostSchema(post)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ])

  const postUrl = `https://duukaafrica.com/blog/${post.slug}`

  return (
    <main className="min-h-screen bg-[oklch(0.985_0.005_85)] dark:bg-[oklch(0.1_0.01_45)]">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Back to Blog */}
      <div className="container mx-auto px-4 pt-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[oklch(0.55_0.18_35)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>
      </div>

      {/* Hero / Cover Image */}
      {post.coverImage && (
        <div className="container mx-auto px-4 mt-4">
          <div className="relative w-full aspect-[21/9] md:aspect-[21/8] overflow-hidden rounded-2xl">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
          </div>
        </div>
      )}

      <article className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[oklch(0.55_0.18_35)]">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[oklch(0.55_0.18_35)]">Blog</Link>
            {post.category && (
              <>
                <span>/</span>
                <Link href={`/blog/category/${post.category.slug}`} className="hover:text-[oklch(0.55_0.18_35)]">
                  {post.category.name}
                </Link>
              </>
            )}
          </nav>

          {/* Category badge */}
          {post.category && (
            <Badge
              className="mb-4 text-xs font-semibold border-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
            >
              {post.category.name}
            </Badge>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-gray-900 dark:text-gray-100 mb-5 leading-tight tracking-tight">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8 pb-8 border-b border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
            {post.author?.name && (
              <span className="flex items-center gap-1.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}>
                  {post.author.name.charAt(0)}
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-300">{post.author.name}</span>
              </span>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readTimeMin} min read
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {post.viewCount.toLocaleString()} views
            </span>
          </div>

          {/* Content */}
          <div className="mb-10 bg-white dark:bg-[oklch(0.13_0.015_45)] rounded-2xl p-6 md:p-10 border border-[oklch(0.94_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
            <BlogContentRenderer content={post.content} />
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-10 pt-8 border-t border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-1">Tags:</span>
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog/tag/${tag.slug}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.2_0.02_45)] text-gray-700 dark:text-gray-300 hover:bg-[oklch(0.6_0.2_35)] hover:text-white transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Share Buttons */}
          <div className="flex items-center gap-3 mb-12 pb-8 border-b border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.22_0.02_45)]">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Share2 className="w-4 h-4" />
              Share
            </span>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.2_0.02_45)] hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] transition-colors"
              aria-label="Share on Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.2_0.02_45)] hover:bg-[#1877F2]/10 hover:text-[#1877F2] transition-colors"
              aria-label="Share on Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + postUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.2_0.02_45)] hover:bg-[#25D366]/10 hover:text-[#25D366] transition-colors"
              aria-label="Share on WhatsApp"
            >
              <Badge className="text-[10px] p-0 w-4 h-4 rounded-full bg-[#25D366] text-white border-0 flex items-center justify-center" />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[oklch(0.96_0.01_85)] dark:bg-[oklch(0.2_0.02_45)] hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] transition-colors"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Related Articles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.map((rp) => (
                  <BlogPostCard key={rp.id} post={rp} />
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </main>
  )
}
