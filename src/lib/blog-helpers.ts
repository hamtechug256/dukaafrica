/**
 * Blog Helper Functions
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://duukaafrica.com'

/**
 * Generate a URL-friendly slug from a title.
 * Appends a timestamp suffix to ensure uniqueness.
 */
export function generateBlogSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // Remove non-alphanumeric except spaces/hyphens
    .replace(/[\s_]+/g, '-')     // Replace spaces/underscores with hyphens
    .replace(/-+/g, '-')         // Collapse multiple hyphens
    .replace(/^-|-$/g, '')       // Trim leading/trailing hyphens

  const suffix = Date.now().toString(36)
  return `${base}-${suffix}`
}

/**
 * Calculate estimated reading time based on word count.
 * Assumes ~200 words per minute.
 */
export function calculateReadTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

/**
 * Strip markdown formatting and truncate to a given length.
 */
export function generateExcerpt(content: string, maxLength = 160): string {
  // Strip markdown syntax
  const stripped = content
    .replace(/#{1,6}\s?/g, '')        // Headers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')  // Bold/italic
    .replace(/~~([^~]+)~~/g, '$1')     // Strikethrough
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')  // Code
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')  // Images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/^>\s?/gm, '')            // Blockquotes
    .replace(/^[-*+]\s/gm, '')         // Unordered lists
    .replace(/^\d+\.\s/gm, '')         // Ordered lists
    .replace(/---+/g, '')              // Horizontal rules
    .replace(/\n+/g, ' ')             // Newlines to spaces
    .trim()

  if (stripped.length <= maxLength) return stripped
  return stripped.substring(0, maxLength).replace(/\s+\S*$/, '') + '…'
}

/**
 * Get a fallback OG image when no cover is provided.
 */
export function getBlogOgImage(coverImage: string | null | undefined): string {
  if (coverImage) return coverImage
  return `${APP_URL}/og-blog-default.png`
}
