import type { TemplateLink, TemplateUtmDefaults } from '../types'

/** UTM parameter names */
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

/** Protocols that should NOT receive UTM params */
const NON_TRACKABLE_PREFIXES = ['mailto:', 'tel:', 'sms:', 'javascript:', '#']

/** Check if a URL is trackable (absolute http/https, not special protocols) */
export function isTrackableUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  for (const prefix of NON_TRACKABLE_PREFIXES) {
    if (trimmed.toLowerCase().startsWith(prefix)) return false
  }
  // Must be absolute URL (http:// or https://) or protocol-relative (//)
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')
}

/** Check if a URL already contains any UTM parameters */
export function hasUtmParams(url: string): boolean {
  try {
    const u = new URL(url, 'https://placeholder.com')
    return UTM_PARAMS.some((p) => u.searchParams.has(p))
  } catch {
    return false
  }
}

/** Inject UTM parameters into a single URL */
export function injectUtmIntoUrl(
  url: string,
  params: { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_term?: string; utm_content?: string },
): string {
  if (!isTrackableUrl(url)) return url
  try {
    const u = new URL(url)
    for (const [key, value] of Object.entries(params)) {
      if (value && !u.searchParams.has(key)) {
        u.searchParams.set(key, value)
      }
    }
    return u.toString()
  } catch {
    return url
  }
}

/** Convert UtmDefaults (camelCase) to URL params (snake_case) */
export function utmDefaultsToParams(
  defaults: TemplateUtmDefaults,
): Record<string, string> {
  const result: Record<string, string> = {}
  if (defaults.utmSource) result.utm_source = defaults.utmSource
  if (defaults.utmMedium) result.utm_medium = defaults.utmMedium
  if (defaults.utmCampaign) result.utm_campaign = defaults.utmCampaign
  return result
}

/**
 * Inject UTM parameters into all <a href> links in an HTML string.
 * Respects data-no-utm attribute and does not override existing UTM params.
 */
export function injectUtmIntoHtml(
  html: string,
  params: { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_term?: string; utm_content?: string },
): string {
  if (!html) return html
  const hasAnyParam = Object.values(params).some(Boolean)
  if (!hasAnyParam) return html

  // Match <a ...href="..."...> but respect data-no-utm
  return html.replace(
    /<a\s([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>/gi,
    (fullMatch, before: string, href: string, after: string) => {
      const fullAttrs = before + after
      // Skip if data-no-utm is present
      if (/data-no-utm/i.test(fullAttrs)) return fullMatch
      // Skip non-trackable
      if (!isTrackableUrl(href)) return fullMatch
      // Skip if already has UTM
      if (hasUtmParams(href)) return fullMatch

      const newHref = injectUtmIntoUrl(href, params)
      return `<a ${before}href="${newHref}"${after}>`
    },
  )
}

/**
 * Extract all <a href> links from HTML for UTM analysis.
 * Returns structured TemplateLink objects.
 */
export function extractLinksFromHtml(html: string): TemplateLink[] {
  if (!html) return []

  const links: TemplateLink[] = []
  // Match all anchor tags
  const regex = /<a\s([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*?)>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null

  // Simple line counter
  const lineOffsets: number[] = [0]
  for (let i = 0; i < html.length; i++) {
    if (html[i] === '\n') lineOffsets.push(i + 1)
  }
  function getLine(index: number): number {
    for (let i = lineOffsets.length - 1; i >= 0; i--) {
      if (lineOffsets[i] <= index) return i + 1
    }
    return 1
  }

  while ((match = regex.exec(html)) !== null) {
    const [, before, href, after, innerHtml] = match
    const fullAttrs = before + after
    const url = href.trim()
    const trackable = isTrackableUrl(url)
    const excludeFromUtm = /data-no-utm/i.test(fullAttrs)
    const hasHardcoded = hasUtmParams(url)
    // Strip HTML tags from inner content for display text
    const text = innerHtml.replace(/<[^>]+>/g, '').trim() || url

    links.push({
      url,
      text: text.substring(0, 100),
      excludeFromUtm,
      hasHardcodedUtm: hasHardcoded,
      isTrackable: trackable,
      line: getLine(match.index),
    })
  }

  return links
}

/**
 * Validate links in HTML and return those that will receive automatic UTM injection.
 * These are: trackable, no hardcoded UTM, no data-no-utm.
 */
export function getAutoUtmLinks(html: string): TemplateLink[] {
  return extractLinksFromHtml(html).filter(
    (link) => link.isTrackable && !link.hasHardcodedUtm && !link.excludeFromUtm,
  )
}

/**
 * Toggle the data-no-utm attribute on a specific link in the HTML.
 * Matches by href value. If multiple links have the same href, operates on the nth occurrence.
 */
export function toggleNoUtmAttribute(html: string, href: string, add: boolean, occurrence = 0): string {
  let count = 0
  return html.replace(
    new RegExp(`(<a\\s)([^>]*?href\\s*=\\s*["']${escapeRegex(href)}["'][^>]*?)(>)`, 'gi'),
    (fullMatch, tagStart: string, attrs: string, tagEnd: string) => {
      if (count++ !== occurrence) return fullMatch
      if (add) {
        if (/data-no-utm/i.test(attrs)) return fullMatch
        return `${tagStart}${attrs} data-no-utm${tagEnd}`
      } else {
        return `${tagStart}${attrs.replace(/\s*data-no-utm\s*/gi, ' ').trim()}${tagEnd}`
      }
    },
  )
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
