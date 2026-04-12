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
        className={`overflow-hidden rounded-xl border bg-white dark:bg-gray-900 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 ${
          featured ? 'md:flex' : ''
        }`}
      >
        {/* Cover Image */}
        <div
          className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${
            featured ? 'md:w-1/2 aspect-[16/10] md:aspect-auto md:min-h-[320px]' : 'aspect-[16/9]'
          }`}
        >
          {post.coverImage ? (
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <span className="text-4xl text-primary/30">📝</span>
            </div>
          )}
          {post.category && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-medium border-0">
              {post.category.name}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className={`p-4 ${featured ? 'md:w-1/2 md:p-6 md:flex md:flex-col md:justify-center' : ''}`}>
          <h3
            className={`font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-2 ${
              featured ? 'text-xl md:text-2xl mb-3' : 'text-base mb-2'
            }`}
          >
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {post.excerpt}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500 flex-wrap">
            {post.author?.name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {post.author.name}
              </span>
            )}
            {post.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.readTimeMin} min read
            </span>
            {post.viewCount > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {post.viewCount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
