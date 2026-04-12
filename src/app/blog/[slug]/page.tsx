import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { generateBlogPostMetadata, generateBlogPostSchema, generateBreadcrumbSchema } from '@/lib/seo'
import { BlogContentRenderer } from '@/components/blog/blog-content-renderer'
import { BlogPostCard } from '@/components/blog/blog-post-card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Eye, User, Facebook, Linkedin, Twitter, Share2 } from 'lucide-react'
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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Hero / Cover Image */}
      {post.coverImage && (
        <div className="relative w-full aspect-[21/9] md:aspect-[21/8] overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      )}

      <article className="container py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-primary">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-primary">Blog</Link>
            {post.category && (
              <>
                <span>/</span>
                <Link href={`/blog/category/${post.category.slug}`} className="hover:text-primary">
                  {post.category.name}
                </Link>
              </>
            )}
          </nav>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8 pb-8 border-b">
            {post.author?.name && (
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
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
          <div className="mb-10">
            <BlogContentRenderer content={post.content} />
          </div>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-10 pt-8 border-t">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-1">Tags:</span>
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog/tag/${tag.slug}`}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Share Buttons */}
          <div className="flex items-center gap-3 mb-12 pb-8 border-b">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <Share2 className="w-4 h-4" />
              Share
            </span>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] transition-colors"
              aria-label="Share on Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-[#1877F2]/10 hover:text-[#1877F2] transition-colors"
              aria-label="Share on Facebook"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + postUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-[#25D366]/10 hover:text-[#25D366] transition-colors"
              aria-label="Share on WhatsApp"
            >
              <Badge className="text-[10px] p-0 w-4 h-4 rounded-full bg-[#25D366] text-white border-0 flex items-center justify-center" />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] transition-colors"
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
