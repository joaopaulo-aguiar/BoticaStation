/** Convert HTML to plain text (basic implementation). */
export function htmlToPlainText(html: string): string {
  let text = html

  // Remove scripts and styles
  text = text.replace(/<script[^>]*>.*?<\/script>/gis, '')
  text = text.replace(/<style[^>]*>.*?<\/style>/gis, '')

  // Convert structural elements to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/p>/gi, '\n\n')
  text = text.replace(/<\/div>/gi, '\n')
  text = text.replace(/<\/tr>/gi, '\n')
  text = text.replace(/<\/td>/gi, '\t')
  text = text.replace(/<\/h[1-6]>/gi, '\n\n')
  text = text.replace(/<\/li>/gi, '\n')

  // Convert links
  text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)')

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")

  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()

  return text
}

/** Extract all {{variable}} placeholders from template. */
export function extractTemplateVariables(html: string, subject = ''): string[] {
  const combined = html + ' ' + subject
  const pattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g
  const seen = new Set<string>()
  const unique: string[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(combined)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1])
      unique.push(match[1])
    }
  }

  return unique
}
