/**
 * Monaco-based HTML code editor with Handlebars highlighting,
 * lint warnings, Emmet support, and Prettier formatting.
 */
import { useEffect, useMemo, useRef, useCallback } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import type { editor as MonacoEditor } from 'monaco-editor'
import { Sun, Moon } from 'lucide-react'

export type EditorTheme = 'dark' | 'light'

interface CodeEditorProps {
  value: string
  onChange: (next: string) => void
  theme: EditorTheme
  onToggleTheme: () => void
  onMount?: (editor: MonacoEditor.IStandaloneCodeEditor) => void
}

export default function CodeEditor({ value, onChange, theme, onToggleTheme, onMount }: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const decorationsRef = useRef<string[]>([])
  const lintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const monacoOptions: MonacoEditor.IStandaloneEditorConstructionOptions = useMemo(
    () => ({
      fontSize: 12,
      lineHeight: 18,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'off' as const,
      folding: true,
      renderLineHighlight: 'all' as const,
      renderWhitespace: 'selection' as const,
      automaticLayout: true,
      tabSize: 2,
      padding: { top: 6, bottom: 6 },
      suggest: { showWords: true },
      formatOnPaste: false,
      formatOnType: false,
    }),
    [],
  )

  // ── Debounced lint ──────────────────────────────────────────────────────────
  const scheduleLint = useCallback(() => {
    if (!monacoRef.current || !editorRef.current) return
    if (lintTimerRef.current) clearTimeout(lintTimerRef.current)

    lintTimerRef.current = setTimeout(() => {
      const monaco = monacoRef.current
      const editor = editorRef.current
      if (!monaco || !editor) return

      const model = editor.getModel()
      if (!model) return

      const text = model.getValue()
      const markers: MonacoEditor.IMarkerData[] = []

      // Check paired HTML tags
      const pairedTags = [
        'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'p', 'a',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      ]

      for (const tag of pairedTags) {
        const openCount = (text.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length
        const closeCount = (text.match(new RegExp(`</${tag}\\s*>`, 'gi')) || []).length
        if (openCount > closeCount) {
          markers.push({
            severity: monaco.MarkerSeverity.Warning,
            message: `Tag <${tag}> pode não estar fechada (${openCount} abertas, ${closeCount} fechadas)`,
            startLineNumber: 1, startColumn: 1,
            endLineNumber: 1, endColumn: 2,
          })
        }
      }

      // Check Handlebars blocks
      const unclosedEach = (text.match(/\{\{#each\s+[\w.]+\}\}/g) || []).length
      const closedEach = (text.match(/\{\{\/each\}\}/g) || []).length
      if (unclosedEach > closedEach) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Bloco {{#each}} não fechado (${unclosedEach} abertos, ${closedEach} fechados)`,
          startLineNumber: 1, startColumn: 1,
          endLineNumber: 1, endColumn: 2,
        })
      }

      const unclosedIf = (text.match(/\{\{#if\s+[\w.]+\}\}/g) || []).length
      const closedIf = (text.match(/\{\{\/if\}\}/g) || []).length
      if (unclosedIf > closedIf) {
        markers.push({
          severity: monaco.MarkerSeverity.Error,
          message: `Bloco {{#if}} não fechado (${unclosedIf} abertos, ${closedIf} fechados)`,
          startLineNumber: 1, startColumn: 1,
          endLineNumber: 1, endColumn: 2,
        })
      }

      monaco.editor.setModelMarkers(model, 'email-template-lint', markers)
    }, 300)
  }, [])

  // ── Handlebars decorations ─────────────────────────────────────────────────
  const updateDecorations = useCallback(() => {
    const monaco = monacoRef.current
    const editor = editorRef.current
    if (!monaco || !editor) return

    const model = editor.getModel()
    if (!model) return

    const text = model.getValue()
    const decos: MonacoEditor.IModelDeltaDecoration[] = []

    // Handlebars blocks
    const blockRe = /\{\{(#(?:each|if|unless)\s+[\w.]+|\/(?:each|if|unless)|else)\}\}/g
    let m: RegExpExecArray | null
    while ((m = blockRe.exec(text))) {
      const start = model.getPositionAt(m.index)
      const end = model.getPositionAt(m.index + m[0].length)
      decos.push({
        range: {
          startLineNumber: start.lineNumber, startColumn: start.column,
          endLineNumber: end.lineNumber, endColumn: end.column,
        },
        options: { inlineClassName: 'vm-hb-block' },
      })
    }

    // Handlebars variables
    const varRe = /\{\{(?!#|\/|else)([^}]+)\}\}/g
    while ((m = varRe.exec(text))) {
      const start = model.getPositionAt(m.index)
      const end = model.getPositionAt(m.index + m[0].length)
      decos.push({
        range: {
          startLineNumber: start.lineNumber, startColumn: start.column,
          endLineNumber: end.lineNumber, endColumn: end.column,
        },
        options: { inlineClassName: 'vm-hb-var' },
      })
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decos)
  }, [])

  // ── Prettier format ────────────────────────────────────────────────────────
  const formatDocument = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return

    try {
      const prettier = await import('prettier/standalone')
      const parserHtml = await import('prettier/plugins/html')
      const input = model.getValue()
      const formatted = await prettier.format(input, {
        parser: 'html',
        plugins: [parserHtml.default],
        htmlWhitespaceSensitivity: 'ignore',
        printWidth: 140,
      })

      if (formatted && formatted !== input) {
        editor.pushUndoStop()
        editor.executeEdits('vm-prettier-format', [
          { range: model.getFullModelRange(), text: formatted },
        ])
        editor.pushUndoStop()
      }
    } catch (e) {
      console.error('[Format] Error:', e)
    }
  }, [])

  // ── Editor mount ───────────────────────────────────────────────────────────
  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco

      // Emmet support
      try {
        import('emmet-monaco-es').then((mod) => {
          mod.emmetHTML(monaco)
        }).catch(() => {})
      } catch { /* ignored */ }

      // Shift+Alt+F to format
      editor.addAction({
        id: 'vm-prettier-format',
        label: 'Format Document (Prettier)',
        keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
        run: formatDocument,
      })

      scheduleLint()
      updateDecorations()

      editor.onDidChangeModelContent(() => {
        scheduleLint()
        updateDecorations()
      })

      onMount?.(editor)
    },
    [formatDocument, scheduleLint, updateDecorations, onMount],
  )

  useEffect(() => {
    scheduleLint()
    updateDecorations()
  }, [value, scheduleLint, updateDecorations])

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* CSS for Handlebars highlighting */}
      <style>{`
        .monaco-editor .vm-hb-var {
          background: rgba(229,192,123,0.18);
          border-radius: 2px;
        }
        .monaco-editor .vm-hb-block {
          background: rgba(198,120,221,0.18);
          border-radius: 2px;
          font-weight: 600;
        }
      `}</style>

      {/* Header bar */}
      <div
        className="flex items-center gap-2 px-2 py-1 border-b"
        style={{
          background: theme === 'dark' ? '#252526' : '#f3f4f6',
          borderColor: theme === 'dark' ? '#333' : '#e2e8f0',
        }}
      >
        <span className="text-[10px] opacity-60 flex-1" style={{ color: theme === 'dark' ? '#ccc' : '#555' }}>
          HTML &bull; Emmet &bull; Ctrl+F (buscar) &bull; Shift+Alt+F (formatar)
        </span>
        <button
          onClick={onToggleTheme}
          className="p-1 rounded hover:bg-black/10 cursor-pointer"
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5" style={{ color: '#ccc' }} />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="html"
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          onMount={handleMount}
          options={monacoOptions}
        />
      </div>
    </div>
  )
}
