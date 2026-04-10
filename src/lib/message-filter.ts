/**
 * Message Content Filter
 *
 * Detects contact information in chat messages to prevent
 * buyers and sellers from moving transactions off-platform.
 *
 * Strategy: Messages containing contact info are NOT blocked
 * (to avoid disrupting legitimate communication about orders),
 * but they ARE flagged for admin review via a warning flag.
 */

export interface FilterResult {
  clean: string       // Message with detected info replaced by [REDACTED]
  flagged: boolean    // Whether contact info was detected
  violations: string[] // List of violation types found
}

// Phone number patterns for all 6 supported countries
const PHONE_PATTERNS = [
  // Uganda: 077X, 078X, 070X, 075X, 076X, 074X, 039X, +256...
  /(?:(?:\+?256|0)(?:77|78|70|75|76|74|39)\d{7})/gi,
  // Kenya: 07XX, 01XX, +254...
  /(?:(?:\+?254|0)(?:7|1)\d{8})/gi,
  // Tanzania: 06XX, 07XX, +255...
  /(?:(?:\+?255|0)(?:6|7)\d{8})/gi,
  // Rwanda: 07XX, +250...
  /(?:(?:\+?250|0)7\d{8})/gi,
  // South Sudan: 09XX, +211...
  /(?:(?:\+?211|0)9\d{7})/gi,
  // Burundi: 07XX, +257...
  /(?:(?:\+?257|0)7\d{7})/gi,
  // Generic: catch sequences that look like phone numbers
  /(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,
]

// WhatsApp detection patterns
const WHATSAPP_PATTERNS = [
  /wa\.me\/\S+/gi,
  /whatsapp(?:\.com)?/gi,
  /whats\s*app/gi,
  /call\s*me\s*(?:on\s*)?(?:whatsapp|wa)/gi,
  /text\s*me\s*(?:on\s*)?(?:whatsapp|wa)/gi,
  /dm\s*me\s*(?:on\s*)?(?:whatsapp|wa)/gi,
]

// Email detection
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// Off-platform transaction phrases
const OFF_PLATFORM_PATTERNS = [
  /pay\s+(?:me\s+)?direct(?:ly)?/gi,
  /pay\s+(?:me\s+)?outside/gi,
  /skip\s+(?:the\s+)?platform/gi,
  /avoid\s+(?:the\s+)?(?:platform\s+)?(?:fee|charges|commission)/gi,
  /better\s+price\s+outside/gi,
  /i\s+can\s+give\s+you\s+a\s+deal/gi,
  /send\s+(?:the\s+)?money\s+direct(?:ly)?/gi,
  /mobile\s+money\s+(?:to|on|is)\s+\d/gi,
  /transfer\s+(?:to|on)\s+(?:my\s+)?(?:phone|account|number)/gi,
]

/**
 * Filters a message for contact information and off-platform transaction attempts.
 * Returns the cleaned message, flag status, and list of violations.
 */
export function filterMessageContent(content: string): FilterResult {
  const violations: string[] = []
  let cleaned = content

  // Check for phone numbers
  for (const pattern of PHONE_PATTERNS) {
    const matches = content.match(pattern)
    if (matches && matches.length > 0) {
      // Only flag if it looks like a real phone (7+ consecutive digits)
      for (const match of matches) {
        const digitsOnly = match.replace(/\D/g, '')
        if (digitsOnly.length >= 9) {
          violations.push('PHONE_NUMBER')
          break
        }
      }
    }
  }

  // Check for WhatsApp
  for (const pattern of WHATSAPP_PATTERNS) {
    if (pattern.test(content)) {
      violations.push('WHATSAPP')
      break
    }
  }

  // Check for email (but allow @duukaafrica.com)
  const emailMatches = content.match(EMAIL_PATTERN)
  if (emailMatches) {
    const externalEmails = emailMatches.filter(e => !e.toLowerCase().includes('duukaafrica'))
    if (externalEmails.length > 0) {
      violations.push('EMAIL')
    }
  }

  // Check for off-platform transaction phrases
  for (const pattern of OFF_PLATFORM_PATTERNS) {
    if (pattern.test(content)) {
      violations.push('OFF_PLATFORM_TRANSACTION')
      break
    }
  }

  // If flagged, redact the sensitive parts
  if (violations.length > 0) {
    // Redact phone numbers
    for (const pattern of PHONE_PATTERNS) {
      cleaned = cleaned.replace(pattern, '[CONTACT_REDACTED]')
    }
    // Redact WhatsApp links
    cleaned = cleaned.replace(/wa\.me\/\S+/gi, '[CONTACT_REDACTED]')
    // Redact external emails
    if (violations.includes('EMAIL')) {
      cleaned = cleaned.replace(EMAIL_PATTERN, (match) => {
        if (match.toLowerCase().includes('duukaafrica')) return match
        return '[CONTACT_REDACTED]'
      })
    }
  }

  return {
    clean: cleaned,
    flagged: violations.length > 0,
    violations: [...new Set(violations)], // deduplicate
  }
}
