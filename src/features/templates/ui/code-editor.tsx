import { useRef, useCallback } from 'react'
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react'
import type * as MonacoTypes from 'monaco-editor'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  height?: string
  readOnly?: boolean
  onCursorPositionChange?: (line: number, column: number) => void
}

export function CodeEditor({
  value,
  onChange,
  language = 'html',
  height = '100%',
  readOnly = false,
  onCursorPositionChange,
}: CodeEditorProps) {
  const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco

      // Emmet support (lazy loaded)
      import('emmet-monaco-es').then((mod) => {
        mod.emmetHTML(monaco)
      })

      // Format on Ctrl+Shift+F
      editor.addAction({
        id: 'format-with-prettier',
        label: 'Formatar com Prettier',
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
        ],
        run: async () => {
          const source = editor.getValue()
          try {
            const prettier = await import('prettier/standalone')
            const parserHtml = await import('prettier/plugins/html')
            const formatted = await prettier.format(source, {
              parser: 'html',
              plugins: [parserHtml.default ?? parserHtml],
              printWidth: 120,
              tabWidth: 2,
              singleQuote: false,
            })
            editor.setValue(formatted)
          } catch (err) {
            console.warn('Prettier formatting failed:', err)
          }
        },
      })

      // Report cursor position
      editor.onDidChangeCursorPosition((e) => {
        onCursorPositionChange?.(e.position.lineNumber, e.position.column)
      })
    },
    [onCursorPositionChange],
  )

  const handleChange = useCallback(
    (val: string | undefined) => {
      onChange(val ?? '')
    },
    [onChange],
  )

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={handleChange}
      onMount={handleMount}
      theme="vs-dark"
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        suggest: { showWords: false },
        quickSuggestions: { other: true, comments: false, strings: true },
        padding: { top: 8 },
      }}
      loading={
        <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-slate-400 text-sm">
          Carregando editor...
        </div>
      }
    />
  )
}

/** Programmatically reveal a specific line in the editor. */
export function revealLineInEditor(
  editorRef: React.RefObject<MonacoTypes.editor.IStandaloneCodeEditor | null>,
  line: number,
  column = 1,
) {
  const editor = editorRef.current
  if (!editor) return
  editor.revealLineInCenter(line)
  editor.setPosition({ lineNumber: line, column })
  editor.focus()
}
