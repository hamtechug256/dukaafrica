import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

async function checkAdminAccess() {
  try {
    const { userId } = await auth()
    if (!userId) return null
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, role: true },
    })
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null
    return user
  } catch (error) {
    console.error('[SEO GENERATE AUTH ERROR]', error)
    return null
  }
}

/**
 * Strip markdown to plain text for analysis.
 */
function stripMarkdown(content: string): string {
  return content
    .replace(/#{1,6}\s?/g, '')
    .replace(/\*{1,3}[^*]+\*{1,3}/g, (m) => m.replace(/\*/g, ''))
    .replace(/~~[^~]+~~/g, (m) => m.replace(/~/g, ''))
    .replace(/`{1,3}[^`]+`{1,3}/g, (m) => m.replace(/`/g, ''))
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[[^\]]+\]\([^)]+\)/g, (m) => {
      const inner = m.match(/\[([^\]]+)\]/)
      return inner ? inner[1] : ''
    })
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/---+/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

/**
 * Extract meaningful keywords from title and content.
 * Uses word frequency analysis + common SEO patterns.
 */
function extractKeywords(title: string, plainContent: string, category?: string): string {
  // Stop words to exclude
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'not',
    'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she',
    'they', 'me', 'us', 'him', 'her', 'them', 'my', 'your', 'his',
    'our', 'their', 'what', 'which', 'who', 'whom', 'how', 'when', 'where',
    'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'only', 'same', 'so', 'than', 'too', 'very',
    'just', 'about', 'above', 'after', 'again', 'also', 'any', 'because',
    'before', 'between', 'during', 'if', 'into', 'over', 'then', 'through',
    'under', 'until', 'up', 'while', 'get', 'make', 'go', 'like', 'use',
    'one', 'two', 'new', 'first', 'last', 'long', 'great', 'little',
    'own', 'old', 'right', 'big', 'high', 'different', 'small', 'large',
    'next', 'early', 'young', 'important', 'much', 'many', 'well',
  ])

  // Combine title (weighted 3x) with content for keyword extraction
  const combinedText = `${title} ${title} ${title} ${plainContent}`.toLowerCase()
  const words = combinedText.match(/\b[a-z]{3,}\b/g) || []

  // Count word frequency
  const freq: Record<string, number> = {}
  for (const word of words) {
    if (!stopWords.has(word) && word.length >= 3) {
      freq[word] = (freq[word] || 0) + 1
    }
  }

  // Get top keywords by frequency
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word)

  // Add location-based keywords for East African marketplace
  const locationKeywords = ['East Africa', 'Uganda', 'Kenya', 'Tanzania', 'Rwanda']
  const hasLocationContext =
    plainContent.toLowerCase().includes('uganda') ||
    plainContent.toLowerCase().includes('kenya') ||
    plainContent.toLowerCase().includes('tanzania') ||
    plainContent.toLowerCase().includes('rwanda') ||
    plainContent.toLowerCase().includes('east africa') ||
    category?.toLowerCase().includes('market') ||
    category?.toLowerCase().includes('ecommerce')

  // Add category keyword
  if (category && !sorted.includes(category.toLowerCase())) {
    sorted.unshift(category.toLowerCase())
  }

  // Add relevant location keywords
  if (hasLocationContext) {
    for (const loc of locationKeywords) {
      const locLower = loc.toLowerCase()
      if (plainContent.toLowerCase().includes(locLower) && !sorted.includes(locLower)) {
        sorted.push(locLower)
      }
    }
    // Add generic marketplace keywords
    const marketplaceKeywords = ['online marketplace', 'DuukaAfrica', 'shopping']
    for (const mk of marketplaceKeywords) {
      if (!sorted.includes(mk.toLowerCase())) {
        sorted.push(mk.toLowerCase())
      }
    }
  }

  // Capitalize first letter of each keyword
  const keywords = [...new Set(sorted)]
    .slice(0, 12)
    .map((kw) => kw.charAt(0).toUpperCase() + kw.slice(1))

  return keywords.join(', ')
}

/**
 * Generate a compelling meta description from content.
 */
function generateMetaDesc(title: string, plainContent: string, category?: string): string {
  // Try to find a good first sentence or paragraph
  const sentences = plainContent
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 200)

  let desc = ''
  if (sentences.length > 0) {
    desc = sentences[0]
  }

  // If first sentence is too short, use first 155 chars of content
  if (desc.length < 50 && plainContent.length > 50) {
    desc = plainContent.substring(0, 140)
  }

  // If still too short, build from title + category
  if (desc.length < 30) {
    desc = `Learn about ${title.toLowerCase()}`
    if (category) {
      desc += ` in the ${category} category`
    }
    desc += ' on DuukaAfrica, East Africa\'s trusted marketplace.'
  }

  // Ensure it ends cleanly
  if (desc.length > 152) {
    desc = desc.substring(0, 149).replace(/\s+\S*$/, '') + '...'
  }

  return desc.substring(0, 155)
}

/**
 * Generate an excerpt from the content.
 */
function generateExcerpt(title: string, plainContent: string, category?: string): string {
  // Use first meaningful portion of content
  if (plainContent.length > 200) {
    let excerpt = plainContent.substring(0, 800)
    // Try to end at a sentence boundary
    const lastSentence = excerpt.lastIndexOf('. ')
    if (lastSentence > 200) {
      excerpt = excerpt.substring(0, lastSentence + 1)
    }
    return excerpt.trim()
  }

  if (plainContent.length > 0) {
    return plainContent.trim()
  }

  // Fallback: generate from title
  return `This article covers ${title.toLowerCase()}. ${
    category ? `Part of our ${category} collection. ` : ''
  }Read more on DuukaAfrica, East Africa's leading online marketplace.`
}

/**
 * Generate a meta title optimized for search.
 */
function generateMetaTitle(title: string, category?: string): string {
  let metaTitle = title.trim()

  // Remove any existing suffixes
  metaTitle = metaTitle.replace(/\s*[-|–—]\s*(DuukaAfrica|Blog).*$/i, '').trim()

  // If title is short enough, just use it
  if (metaTitle.length <= 55) {
    return metaTitle
  }

  // Try to split at common separators
  const separators = [' - ', ' | ', ': ', ' – ', ' — ']
  for (const sep of separators) {
    if (metaTitle.includes(sep)) {
      const parts = metaTitle.split(sep)
      if (parts[0].length >= 20 && parts[0].length <= 55) {
        return parts[0].trim()
      }
    }
  }

  // Truncate at word boundary
  if (metaTitle.length > 57) {
    metaTitle = metaTitle.substring(0, 54).replace(/\s+\S*$/, '') + '...'
  }

  return metaTitle
}

// POST /api/admin/blog/generate-seo
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAccess()
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, category } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required to generate SEO' },
        { status: 400 }
      )
    }

    const plainContent = stripMarkdown(content)

    // Generate all SEO fields using template-based logic (no AI required)
    const metaTitle = generateMetaTitle(title, category)
    const metaDesc = generateMetaDesc(title, plainContent, category)
    const keywords = extractKeywords(title, plainContent, category)
    const excerpt = generateExcerpt(title, plainContent, category)

    return NextResponse.json({
      metaTitle,
      metaDesc,
      keywords,
      excerpt,
    })
  } catch (error) {
    console.error('[SEO GENERATE ERROR]', error)

    // Fallback: return basic auto-generated SEO
    const body = await request.json().catch(() => ({}))
    const { title, content } = body
    const plainContent = content ? stripMarkdown(content) : ''

    return NextResponse.json({
      metaTitle: (title || '').substring(0, 60),
      metaDesc: plainContent.substring(0, 152) + (plainContent.length > 152 ? '...' : ''),
      keywords: (title || '').split(/\s+/).slice(0, 8).join(', '),
      excerpt: plainContent.substring(0, 500),
    })
  }
}
