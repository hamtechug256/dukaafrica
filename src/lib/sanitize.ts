/**
 * Sanitizes user-generated text to prevent stored XSS.
 * React auto-escapes in JSX, but this protects against
 * any future dangerouslySetInnerHTML usage or non-React contexts.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/** Strips HTML tags entirely (for fields like names, titles) */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}
