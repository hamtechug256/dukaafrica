import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

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
    const contentPreview = plainContent.substring(0, 3000) // Send up to 3000 chars to AI

    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert SEO specialist for DuukaAfrica, an East African e-commerce marketplace (Uganda, Kenya, Tanzania, Rwanda). Your job is to generate perfect SEO metadata for blog articles.

RULES:
- metaTitle: Max 60 characters. Include primary keyword naturally. Make it click-worthy.
- metaDesc: Max 155 characters. Compelling, includes call-to-action. Must contain relevant keywords.
- keywords: 8-15 relevant comma-separated keywords. Include location-based keywords (Uganda, East Africa, etc.) where relevant.
- excerpt: 150-200 word summary of the article in plain text (no markdown). Engaging and informative.
- Only return valid JSON, nothing else.
- All output in English.`,
        },
        {
          role: 'user',
          content: `Generate SEO metadata for this blog article:

Title: "${title}"
${category ? `Category: ${category}` : ''}

Content preview:
${contentPreview}

Return ONLY a JSON object with these exact keys:
{
  "metaTitle": "...",
  "metaDesc": "...",
  "keywords": "...",
  "excerpt": "..."
}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    })

    const responseText = completion.choices[0]?.message?.content?.trim() || ''

    // Extract JSON from response (handle markdown code blocks)
    let jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText

    let seoData: { metaTitle: string; metaDesc: string; keywords: string; excerpt: string }

    try {
      seoData = JSON.parse(jsonStr)
    } catch {
      // Fallback: generate basic SEO without AI
      seoData = {
        metaTitle: title.length > 60 ? title.substring(0, 57) + '...' : title,
        metaDesc: plainContent.substring(0, 152) + '...',
        keywords: title.split(/\s+/).slice(0, 8).join(', '),
        excerpt: plainContent.substring(0, 500),
      }
    }

    // Validate and trim to limits
    return NextResponse.json({
      metaTitle: (seoData.metaTitle || '').substring(0, 60),
      metaDesc: (seoData.metaDesc || '').substring(0, 155),
      keywords: seoData.keywords || '',
      excerpt: (seoData.excerpt || '').substring(0, 1000),
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
