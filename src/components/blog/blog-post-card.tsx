import Link from 'next/link'
import { Calendar, Clock, Eye, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface BlogPostCardProps {
  post: {
    id: string
    title: string
    slug: string
    excerpt?: string | null
    coverImage?: string | null
    readTimeMin: number
    viewCount: number
    publishedAt?: string | Date | null
    author?: { name: string | null } | null
    category?: { name: string; slug: string } | null
    tags?: { name: string; slug: string }[]
  }
  featured?: boolean
}

export function BlogPostCard({ post, featured = false }: BlogPostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article
        className={`overflow-hidden rounded-2xl bg-white dark:bg-[oklch(0.15_0.02_45)] transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-[oklch(0.92_0.01_85)] dark:border-[oklch(0.25_0.02_45)] hover:border-[oklch(0.8_0.02_85)] dark:hover:border-[oklch(0.35_0.02_45)] ${
          featured ? 'md:flex' : ''
        }`}
      >
        {/* Cover Image */}
        <div
          className={`relative overflow-hidden ${
            featured ? 'md:w-1/2 aspect-[16/10] md:aspect-auto md:min-h-[340px]' : 'aspect-[16/10]'
          }`}
        >
          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, oklch(0.95 0.02 35), oklch(0.92 0.03 140))' }}
            >
              <span className="text-4xl opacity-40">📝</span>
            </div>
          )}
          {/* Gradient overlay at bottom of image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {post.category && (
            <Badge
              className="absolute top-3 left-3 text-xs font-semibold border-0 shadow-sm"
              style={{ background: 'linear-gradient(135deg, oklch(0.6 0.2 35), oklch(0.55 0.18 40))' }}
            >
              {post.category.name}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className={`p-5 ${featured ? 'md:w-1/2 md:p-8 md:flex md:flex-col md:justify-center' : ''}`}>
          <h3
            className={`font-bold text-gray-900 dark:text-gray-100 group-hover:text-[oklch(0.6_0.2_35)] transition-colors line-clamp-2 leading-snug ${
              featured ? 'text-xl md:text-2xl mb-3' : 'text-lg mb-2.5'
            }`}
          >
            {post.title}
          </h3>

          {post.excerpt && (
            <p className={`text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed ${
              featured ? 'text-base' : 'text-sm'
            }`}>
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500 flex-wrap">
            {post.author?.name && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {post.author.name}
              </span>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.readTimeMin} min
            </span>
            {post.viewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {post.viewCount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
