/**
 * HTML instrumentation for visual inspector.
 * Injects `data-vm-node` attributes into each element so click mapping
 * from the preview iframe can navigate to the corresponding source line.
 */
import * as parse5 from 'parse5'

export type SourceLocation = {
  startLine: number
  startCol: number
  endLine?: number
  endCol?: number
}

export type NodeLocationMap = Record<string, SourceLocation>

interface Parse5Attr {
  name: string
  value: string
}

interface Parse5Node {
  nodeName: string
  attrs?: Parse5Attr[]
  childNodes?: Parse5Node[]
  content?: { childNodes?: Parse5Node[] }
  sourceCodeLocation?: {
    startLine?: number
    startCol?: number
    endLine?: number
    endCol?: number
    startTag?: {
      startLine?: number
      startCol?: number
      endLine?: number
      endCol?: number
    }
  }
}

function addOrReplaceAttr(node: Parse5Node, name: string, value: string) {
  if (!node.attrs) node.attrs = []
  const existing = node.attrs.find((a) => a.name === name)
  if (existing) existing.value = value
  else node.attrs.push({ name, value })
}

function getStartTagLocation(node: Parse5Node): SourceLocation | null {
  const loc = node.sourceCodeLocation
  if (!loc) return null

  const tagLoc = loc.startTag ?? loc
  if (!tagLoc?.startLine || !tagLoc?.startCol) return null

  return {
    startLine: tagLoc.startLine,
    startCol: tagLoc.startCol,
    endLine: tagLoc.endLine,
    endCol: tagLoc.endCol,
  }
}

function walk(node: Parse5Node, visit: (node: Parse5Node) => void) {
  visit(node)
  const childNodes = node.childNodes ?? []
  for (const child of childNodes) walk(child, visit)
  if (node.content && node.content.childNodes) {
    for (const child of node.content.childNodes) walk(child, visit)
  }
}

/**
 * Parses HTML and injects `data-vm-node` attributes into each element.
 * Returns instrumented HTML and a map from node id -> source location.
 */
export function instrumentHtmlForMapping(inputHtml: string): { html: string; map: NodeLocationMap } {
  const map: NodeLocationMap = {}

  if (!inputHtml || typeof inputHtml !== 'string' || inputHtml.trim() === '') {
    return { html: inputHtml || '', map }
  }

  try {
    let nextId = 1

    const fragment = parse5.parseFragment(inputHtml, {
      sourceCodeLocationInfo: true,
    }) as unknown as Parse5Node

    walk(fragment, (node) => {
      if (!node || typeof node.nodeName !== 'string') return
      if (
        node.nodeName === '#text' ||
        node.nodeName === '#comment' ||
        node.nodeName === '#documentType' ||
        node.nodeName === '#document-fragment'
      )
        return

      const id = `vm${nextId++}`
      const loc = getStartTagLocation(node)
      if (loc) map[id] = loc

      addOrReplaceAttr(node, 'data-vm-node', id)
    })

    const html = parse5.serialize(fragment as unknown as parse5.DefaultTreeAdapterMap['parentNode'])
    return { html, map }
  } catch (e) {
    console.error('[instrumentHtml] Error parsing HTML:', e)
    return { html: inputHtml, map }
  }
}
