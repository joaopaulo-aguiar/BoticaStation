/**
 * Client-side Handlebars-like template renderer.
 * Supports {{variable}}, {{#each array}}...{{/each}},
 * {{#if condition}}...{{else}}...{{/if}}, nested paths, and @index/@first/@last.
 */

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

type Token =
  | { type: 'text'; value: string }
  | { type: 'variable'; path: string }
  | { type: 'each_start'; path: string }
  | { type: 'each_end' }
  | { type: 'if_start'; path: string }
  | { type: 'unless_start'; path: string }
  | { type: 'unless_end' }
  | { type: 'else' }
  | { type: 'if_end' }

type ASTNode =
  | { type: 'text'; value: string }
  | { type: 'variable'; path: string }
  | { type: 'each'; path: string; body: ASTNode[] }
  | { type: 'if'; path: string; thenBranch: ASTNode[]; elseBranch: ASTNode[] }
  | { type: 'unless'; path: string; body: ASTNode[] }

function tokenize(template: string): Token[] {
  const tokens: Token[] = []
  const tagRegex = /\{\{(#each|#if|#unless|else|\/each|\/if|\/unless|[\w.@]+)\s*([\w.]*)\s*\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: template.slice(lastIndex, match.index) })
    }

    const [, tag, param] = match

    if (tag === '#each') {
      tokens.push({ type: 'each_start', path: param })
    } else if (tag === '/each') {
      tokens.push({ type: 'each_end' })
    } else if (tag === '#if') {
      tokens.push({ type: 'if_start', path: param })
    } else if (tag === '/if') {
      tokens.push({ type: 'if_end' })
    } else if (tag === '#unless') {
      tokens.push({ type: 'unless_start', path: param })
    } else if (tag === '/unless') {
      tokens.push({ type: 'unless_end' })
    } else if (tag === 'else') {
      tokens.push({ type: 'else' })
    } else {
      tokens.push({ type: 'variable', path: tag })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < template.length) {
    tokens.push({ type: 'text', value: template.slice(lastIndex) })
  }

  return tokens
}

function parseTokens(tokens: Token[]): ASTNode[] {
  let i = 0

  function parseUntil(endCondition: (token: Token) => boolean): ASTNode[] {
    const result: ASTNode[] = []

    while (i < tokens.length) {
      const token = tokens[i]

      if (endCondition(token)) break

      if (token.type === 'text') {
        result.push({ type: 'text', value: token.value })
        i++
      } else if (token.type === 'variable') {
        result.push({ type: 'variable', path: token.path })
        i++
      } else if (token.type === 'each_start') {
        i++
        const body = parseUntil((t) => t.type === 'each_end')
        if (i < tokens.length && tokens[i].type === 'each_end') i++
        result.push({ type: 'each', path: token.path, body })
      } else if (token.type === 'if_start') {
        i++
        const thenBranch = parseUntil((t) => t.type === 'else' || t.type === 'if_end')
        let elseBranch: ASTNode[] = []

        if (i < tokens.length && tokens[i].type === 'else') {
          i++
          elseBranch = parseUntil((t) => t.type === 'if_end')
        }

        if (i < tokens.length && tokens[i].type === 'if_end') i++
        result.push({ type: 'if', path: token.path, thenBranch, elseBranch })
      } else if (token.type === 'unless_start') {
        i++
        const body = parseUntil((t) => t.type === 'unless_end')
        if (i < tokens.length && tokens[i].type === 'unless_end') i++
        result.push({ type: 'unless', path: token.path, body })
      } else {
        i++
      }
    }

    return result
  }

  const nodes = parseUntil(() => false)
  return nodes
}

function getFromObject(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined

  const keys = path.split('.')
  let value: unknown = obj

  for (const key of keys) {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }

  return value
}

function getValue(context: Record<string, unknown>, path: string): unknown {
  if (path === 'this') return context['this'] ?? context

  if (path.startsWith('this.')) {
    const subPath = path.substring(5)
    const thisVal = context['this'] ?? context
    return getFromObject(thisVal, subPath)
  }

  if (path in context) return context[path]
  return getFromObject(context, path)
}

export function isTruthy(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (value === false) return false
  if (typeof value === 'string' && value === '') return false
  if (Array.isArray(value) && value.length === 0) return false
  return true
}

function renderNodes(
  nodes: ASTNode[],
  context: Record<string, unknown>,
  rootData: Record<string, unknown>,
): string {
  let result = ''

  for (const node of nodes) {
    if (node.type === 'text') {
      result += node.value
    } else if (node.type === 'variable') {
      const value = getValue(context, node.path)
      if (value !== undefined && value !== null && typeof value !== 'object') {
        result += String(value)
      } else {
        result += `{{${node.path}}}`
      }
    } else if (node.type === 'each') {
      const array = getValue(context, node.path)

      if (Array.isArray(array)) {
        for (let idx = 0; idx < array.length; idx++) {
          const item = array[idx] as unknown

          let itemContext: Record<string, unknown>

          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            itemContext = {
              ...rootData,
              ...(item as Record<string, unknown>),
              this: item,
              '@index': idx,
              '@first': idx === 0,
              '@last': idx === array.length - 1,
            }
          } else {
            itemContext = {
              ...rootData,
              this: item,
              '@index': idx,
              '@first': idx === 0,
              '@last': idx === array.length - 1,
            }
          }

          result += renderNodes(node.body, itemContext, rootData)
        }
      }
    } else if (node.type === 'if') {
      const value = getValue(context, node.path)

      if (isTruthy(value)) {
        result += renderNodes(node.thenBranch, context, rootData)
      } else {
        result += renderNodes(node.elseBranch, context, rootData)
      }
    } else if (node.type === 'unless') {
      const value = getValue(context, node.path)
      if (!isTruthy(value)) {
        result += renderNodes(node.body, context, rootData)
      }
    }
  }

  return result
}

/** Render a Handlebars-style template with the given data object. */
export function renderHandlebars(template: string, data: Record<string, unknown>): string {
  if (!template || typeof template !== 'string') return template || ''

  try {
    const tokens = tokenize(template)
    const ast = parseTokens(tokens)
    return renderNodes(ast, data, data)
  } catch (e) {
    console.error('[renderHandlebars] Error:', e)
    return template
  }
}

/** Safely parse a JSON string into an object. Returns {} on failure. */
export function safeParseJsonObject(input: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(input)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    return {}
  } catch {
    return {}
  }
}

export function getNestedValue(data: unknown, path: string): unknown {
  return getFromObject(data, path)
}
