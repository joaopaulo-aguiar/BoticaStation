/**
 * Email Template Management Page
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────────┐
 * │ Header: [←] Templates SES  [Refresh] [+ Novo Template]  │
 * ├──────────┬───────────────────────────────────────────────┤
 * │ SIDEBAR  │  MAIN CONTENT                                │
 * │ template │  (placeholder or editor)                     │
 * │ list     │                                              │
 * │          │  Editor:                                     │
 * │          │  ┌────────────────────────────────────────┐   │
 * │          │  │ Name / Subject / Actions              │   │
 * │          │  ├──────────────────┬─────────────────────┤   │
 * │          │  │ CODE | TEST DATA │  PREVIEW            │   │
 * │          │  │ (Monaco / JSON)  │  (iframe)           │   │
 * │          │  └──────────────────┴─────────────────────┘   │
 * └──────────┴───────────────────────────────────────────────┘
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  useSendTestEmail,
  useVerifiedIdentities,
} from '@/features/templates/hooks/use-templates'
import CodeEditor, { type EditorTheme } from './code-editor'
import { renderHandlebars, safeParseJsonObject } from '@/features/templates/lib/handlebars-lite'
import { instrumentHtmlForMapping, type NodeLocationMap } from '@/features/templates/lib/instrument-html'
import { buildPreviewSrcDoc } from '@/features/templates/lib/preview-srcdoc'
import { htmlToPlainText } from '@/features/templates/lib/html-to-text'
import { Button, Input, Label, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui'
import type { editor as MonacoEditor } from 'monaco-editor'
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Copy,
  Download,
  Upload,
  Save,
  Send,
  Monitor,
  Tablet,
  Smartphone,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Code,
  Braces,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  FileCode,
  ArrowUpDown,
  Info,
} from 'lucide-react'
import { toSesTemplateName } from '@/features/settings/api/config-api'

// ─── Types ─────────────────────────────────────────────────────────────────

type EditorMode = 'list' | 'edit' | 'new'
type PreviewDevice = 'desktop' | 'tablet' | 'mobile'
type ActiveTab = 'code' | 'testdata'
type SortMode = 'name-asc' | 'name-desc' | 'date-desc' | 'date-asc'

const DEVICE_SIZES: Record<PreviewDevice, { width: number; height: number; label: string }> = {
  desktop: { width: 0, height: 0, label: 'Desktop' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  mobile: { width: 375, height: 812, label: 'Mobile' },
}

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin:0; padding:20px; font-family:Arial, sans-serif; background-color:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden;">
    <tr>
      <td style="padding:30px; text-align:center; background-color:#16a34a;">
        <h1 style="color:#ffffff; margin:0; font-size:24px;">Botica Alternativa</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        <p style="color:#333333; font-size:16px;">Olá, {{nome}}!</p>
        <p style="color:#666666; font-size:14px;">Este é um template de exemplo.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px; background-color:#f9f9f9; text-align:center; color:#999999; font-size:12px;">
        &copy; 2026 Botica Alternativa. Todos os direitos reservados.
      </td>
    </tr>
  </table>
</body>
</html>`

const DEFAULT_TEST_DATA = JSON.stringify({ nome: 'João', subject: 'Boas-vindas' }, null, 2)

// ─── Component ─────────────────────────────────────────────────────────────

export function TemplatesPage() {
  // ── Global state ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<EditorMode>('list')
  const [search, setSearch] = useState('')
  const [selectedTemplateName, setSelectedTemplateName] = useState<string | null>(null)

  // ── Editor state ─────────────────────────────────────────────────────────
  const [templateDisplayName, setTemplateDisplayName] = useState('')
  const [templateSesName, setTemplateSesName] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateSubject, setTemplateSubject] = useState('')
  const [templateHtml, setTemplateHtml] = useState(DEFAULT_HTML)
  const [templateText, setTemplateText] = useState('')
  const [testDataJson, setTestDataJson] = useState(DEFAULT_TEST_DATA)
  const [activeTab, setActiveTab] = useState<ActiveTab>('code')
  const [editorTheme, setEditorTheme] = useState<EditorTheme>('dark')

  // ── Preview state ────────────────────────────────────────────────────────
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop')
  const [previewDarkMode, setPreviewDarkMode] = useState(false)
  const [inspectorEnabled, setInspectorEnabled] = useState(true)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewSubject, setPreviewSubject] = useState('')

  // ── Layout state ─────────────────────────────────────────────────────────
  const [editorWidth, setEditorWidth] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<string | null>(null)
  const [duplicateName, setDuplicateName] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('name-asc')
  const [sendTestDialogOpen, setSendTestDialogOpen] = useState(false)
  const [toEmail, setToEmail] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [contextMenu, setContextMenu] = useState<{ name: string; x: number; y: number } | null>(null)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null)
  const nodeMapRef = useRef<NodeLocationMap>({})
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Queries & Mutations ──────────────────────────────────────────────────
  const { data: templates, isLoading, error, refetch } = useTemplates()
  const templateQuery = useTemplate(selectedTemplateName)
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()
  const deleteMutation = useDeleteTemplate()
  const duplicateMutation = useDuplicateTemplate()
  const sendTestMutation = useSendTestEmail()
  const { data: identities } = useVerifiedIdentities()

  const isSaving = createMutation.isPending || updateMutation.isPending

  // ── Filtered & sorted templates ──────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    if (!templates) return []
    let list = [...templates]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.displayName.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q),
      )
    }
    switch (sortMode) {
      case 'name-asc':
        list.sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'))
        break
      case 'name-desc':
        list.sort((a, b) => b.displayName.localeCompare(a.displayName, 'pt-BR'))
        break
      case 'date-desc':
        list.sort((a, b) => {
          const da = a.updatedAt || a.createdAt || ''
          const db = b.updatedAt || b.createdAt || ''
          return db.localeCompare(da)
        })
        break
      case 'date-asc':
        list.sort((a, b) => {
          const da = a.updatedAt || a.createdAt || ''
          const db = b.updatedAt || b.createdAt || ''
          return da.localeCompare(db)
        })
        break
    }
    return list
  }, [templates, search, sortMode])

  const cycleSortMode = () => {
    setSortMode((prev) => {
      const modes: SortMode[] = ['name-asc', 'name-desc', 'date-desc', 'date-asc']
      const idx = modes.indexOf(prev)
      return modes[(idx + 1) % modes.length]
    })
  }

  const sortLabel = {
    'name-asc': 'A → Z',
    'name-desc': 'Z → A',
    'date-desc': 'Recentes',
    'date-asc': 'Antigos',
  }[sortMode]

  // ── Load template data into editor ───────────────────────────────────────
  useEffect(() => {
    if (templateQuery.data && mode === 'edit') {
      const t = templateQuery.data
      setTemplateSesName(t.name)
      // Find display name from templates list
      const meta = templates?.find((tpl) => tpl.name === t.name)
      setTemplateDisplayName(meta?.displayName ?? t.name)
      setTemplateName(t.name)
      setTemplateSubject(t.subject)
      setTemplateHtml(t.html)
      setTemplateText(t.text || '')
      if (t.testData) {
        setTestDataJson(JSON.stringify(t.testData, null, 2))
      }
    }
  }, [templateQuery.data, mode, templates])

  // ── Preview rendering (real-time) ────────────────────────────────────────
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const data = safeParseJsonObject(testDataJson)
      const renderedHtml = renderHandlebars(templateHtml, data)
      const renderedSubject = renderHandlebars(templateSubject, data)

      const { html: instrumentedHtml, map } = instrumentHtmlForMapping(renderedHtml)
      nodeMapRef.current = map

      const srcDoc = buildPreviewSrcDoc(instrumentedHtml, {
        inspectorEnabled,
        darkMode: previewDarkMode,
      })

      setPreviewHtml(srcDoc)
      setPreviewSubject(renderedSubject)
    })
    return () => cancelAnimationFrame(id)
  }, [templateHtml, templateSubject, testDataJson, inspectorEnabled, previewDarkMode])

  // ── Preview click → navigate to source line ─────────────────────────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== 'vm-preview-click') return
      const loc = nodeMapRef.current[e.data.id]
      if (!loc || !editorRef.current) return

      setActiveTab('code')
      const editor = editorRef.current
      editor.revealPositionInCenter({ lineNumber: loc.startLine, column: loc.startCol })
      editor.setSelection({
        startLineNumber: loc.startLine,
        startColumn: loc.startCol,
        endLineNumber: loc.endLine ?? loc.startLine,
        endColumn: loc.endCol ?? loc.startCol + 10,
      })
      editor.focus()
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── Ctrl+S to save ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && mode !== 'list') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  // ── Close context menu on outside click ──────────────────────────────────
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [contextMenu])

  // ── Drag resizer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent) => {
      if (!splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      let pct = ((e.clientX - rect.left) / rect.width) * 100
      pct = Math.max(25, Math.min(80, pct))
      setEditorWidth(pct)
    }
    const handleUp = () => setIsDragging(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleNewTemplate = () => {
    setMode('new')
    setSelectedTemplateName(null)
    setTemplateDisplayName('')
    setTemplateSesName('')
    setTemplateName('')
    setTemplateSubject('')
    setTemplateHtml(DEFAULT_HTML)
    setTemplateText('')
    setTestDataJson(DEFAULT_TEST_DATA)
    setActiveTab('code')
  }

  const handleSelectTemplate = (name: string) => {
    setSelectedTemplateName(name)
    setMode('edit')
    setActiveTab('code')
  }

  const handleBackToList = () => {
    setMode('list')
    setSelectedTemplateName(null)
  }

  const handleSave = () => {
    if (mode === 'new' && !templateDisplayName.trim()) return
    if (!templateSubject.trim()) return

    const testData = safeParseJsonObject(testDataJson)
    const data = {
      subject: templateSubject,
      html: templateHtml,
      text: templateText || undefined,
      testData: Object.keys(testData).length > 0 ? testData : undefined,
    }

    if (mode === 'new') {
      createMutation.mutate(
        { name: templateDisplayName, ...data },
        {
          onSuccess: (result) => {
            setMode('edit')
            const sesName = result.sesName
            setSelectedTemplateName(sesName)
            setTemplateSesName(sesName)
            setTemplateName(sesName)
          },
        },
      )
    } else {
      updateMutation.mutate({
        name: templateSesName || templateName,
        data: { ...data, displayName: templateDisplayName },
      })
    }
  }

  const handleDelete = (name: string) => {
    setDeleteTarget(name)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        setDeleteTarget(null)
        if (selectedTemplateName === deleteTarget) {
          handleBackToList()
        }
      },
    })
  }

  const handleDuplicate = (name: string) => {
    setDuplicateTarget(name)
    const meta = templates?.find((t) => t.name === name)
    setDuplicateName(`${meta?.displayName ?? name} - cópia`)
    setDuplicateDialogOpen(true)
  }

  const confirmDuplicate = () => {
    if (!duplicateTarget || !duplicateName.trim()) return
    duplicateMutation.mutate(
      { sourceName: duplicateTarget, newName: duplicateName },
      {
        onSuccess: () => {
          setDuplicateDialogOpen(false)
          setDuplicateTarget(null)
          setDuplicateName('')
        },
      },
    )
  }

  const handleSendTest = () => {
    if (!toEmail || !fromEmail) return
    const data = safeParseJsonObject(testDataJson)
    const rendered = renderHandlebars(templateHtml, data)
    const renderedSubject = renderHandlebars(templateSubject, data)

    sendTestMutation.mutate(
      {
        toEmail,
        fromEmail,
        subject: renderedSubject,
        html: rendered,
        text: templateText ? renderHandlebars(templateText, data) : undefined,
      },
      {
        onSuccess: () => {
          setSendTestDialogOpen(false)
        },
      },
    )
  }

  const handleGenerateText = () => {
    setTemplateText(htmlToPlainText(templateHtml))
  }

  const handleUploadHtml = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content)
          if (parsed.html) {
            setTemplateHtml(parsed.html)
            if (parsed.subject) setTemplateSubject(parsed.subject)
            if (parsed.text) setTemplateText(parsed.text)
            if (parsed.testData) setTestDataJson(JSON.stringify(parsed.testData, null, 2))
            if (parsed.templateName) setTemplateDisplayName(parsed.templateName)
          } else {
            setTestDataJson(content)
          }
        } catch {
          setTemplateHtml(content)
        }
      } else {
        setTemplateHtml(content)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleDownloadJson = () => {
    const data = {
      templateName: templateDisplayName || templateName,
      sesName: templateSesName || templateName,
      subject: templateSubject,
      html: templateHtml,
      text: templateText,
      testData: safeParseJsonObject(testDataJson),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${templateDisplayName || templateName || 'template'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleContextMenu = (e: React.MouseEvent, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ name, x: e.clientX, y: e.clientY })
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-1.5rem)] -m-4 lg:-m-6">
      {/* Hidden file input for upload */}
      <input ref={fileInputRef} type="file" accept=".html,.htm,.json" className="hidden" onChange={handleFileChange} />

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-botica-100 text-botica-700">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900">Templates de E-mail</h1>
          <p className="text-xs text-slate-500">Gerenciamento de templates para campanhas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button size="sm" onClick={handleNewTemplate}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Template</span>
          </Button>
        </div>
      </div>

      {/* ── Main content (sidebar + editor) ──────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-60 border-r border-slate-200 bg-white">
          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Buscar template..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <button
              onClick={cycleSortMode}
              className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 hover:text-botica-600 cursor-pointer transition-colors"
              title="Clique para alternar a ordenação"
            >
              <ArrowUpDown className="w-3 h-3" />
              Ordenar: {sortLabel}
            </button>
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-botica-600" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 px-3 py-4">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-xs text-red-600">Erro ao carregar</span>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">
                {search ? 'Nenhum resultado.' : 'Nenhum template.'}
              </p>
            ) : (
              <div className="py-1">
                {filteredTemplates.map((t) => (
                  <div
                    key={t.name}
                    className={`group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-sm ${
                      selectedTemplateName === t.name
                        ? 'bg-botica-50 text-botica-700 border-r-2 border-botica-600'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => handleSelectTemplate(t.name)}
                    title={`${t.displayName}\nSES: ${t.name}${t.createdAt ? '\nCriado: ' + new Date(t.createdAt).toLocaleDateString('pt-BR') : ''}${t.updatedAt ? '\nAtualizado: ' + new Date(t.updatedAt).toLocaleDateString('pt-BR') : ''}`}
                  >
                    <FileCode className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate text-xs font-medium">{t.displayName}</span>
                      {t.displayName !== t.name && (
                        <span className="block truncate text-[10px] text-slate-400 font-mono">{t.name}</span>
                      )}
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 cursor-pointer"
                      onClick={(e) => handleContextMenu(e, t.name)}
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Count footer */}
          <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-400">
            {templates?.length ?? 0} template{(templates?.length ?? 0) !== 1 ? 's' : ''}
          </div>
        </aside>

        {/* ── Main panel ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
          {mode === 'list' ? (
            /* ── Placeholder ─────────────────────────────────────────── */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
              <FileText className="w-12 h-12 opacity-40" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500">Selecione um template</p>
                <p className="text-xs mt-1">Escolha um template na lista ou crie um novo</p>
              </div>
              <Button size="sm" onClick={handleNewTemplate}>
                <Plus className="w-4 h-4" />
                Novo Template
              </Button>

              {/* Mobile template list */}
              <div className="md:hidden w-full max-w-md px-4">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder="Buscar template..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  {filteredTemplates.map((t) => (
                    <div
                      key={t.name}
                      className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50"
                      onClick={() => handleSelectTemplate(t.name)}
                    >
                      <FileCode className="w-4 h-4 text-slate-400" />
                      <span className="flex-1 text-sm font-medium truncate">{t.displayName}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Editor ─────────────────────────────────────────────── */
            <div className="flex-1 flex flex-col min-h-0">
              {/* ── Editor header bar ──────────────────────────────── */}
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white border-b border-slate-200">
                <button
                  onClick={handleBackToList}
                  className="p-1.5 rounded hover:bg-slate-100 text-slate-500 cursor-pointer"
                  title="Voltar à lista"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Template name */}
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-slate-500 whitespace-nowrap">Nome:</Label>
                  <div className="relative group">
                    <Input
                      value={templateDisplayName}
                      onChange={(e) => setTemplateDisplayName(e.target.value)}
                      placeholder="Nome do template (ex: Promo | Black Friday)"
                      className="h-7 text-xs w-52"
                    />
                    {templateDisplayName && (
                      <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg font-mono whitespace-nowrap">
                        SES: {mode === 'new' ? toSesTemplateName(templateDisplayName) : templateSesName}
                      </div>
                    )}
                  </div>
                  {mode === 'edit' && templateSesName && (
                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-32 hidden lg:inline" title={`Identificador SES: ${templateSesName}`}>
                      <Info className="w-3 h-3 inline mr-0.5" />{templateSesName}
                    </span>
                  )}
                </div>

                {/* Subject */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  <Label className="text-xs text-slate-500 whitespace-nowrap">Subject:</Label>
                  <Input
                    value={templateSubject}
                    onChange={(e) => setTemplateSubject(e.target.value)}
                    placeholder="Assunto do e-mail"
                    className="h-7 text-xs"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleUploadHtml}
                    title="Upload HTML/JSON"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleDownloadJson}
                    title="Download JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleGenerateText}
                    title="Gerar texto plano do HTML"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSendTestDialogOpen(true)}
                  >
                    <Send className="w-3 h-3" />
                    Enviar Teste
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSave}
                    disabled={isSaving || (!templateDisplayName.trim() && mode === 'new') || !templateSubject.trim()}
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Salvar
                  </Button>
                </div>
              </div>

              {/* ── Split: editor + preview ────────────────────────── */}
              <div
                ref={splitContainerRef}
                className="flex-1 flex min-h-0"
                style={{ cursor: isDragging ? 'col-resize' : undefined }}
              >
                {/* ── Left panel (editor) ──────────────────────────── */}
                <div className="flex flex-col min-h-0" style={{ width: `${editorWidth}%` }}>
                  {/* Tabs */}
                  <div className="flex items-center border-b border-slate-200 bg-white">
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'code'
                          ? 'border-botica-600 text-botica-700'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                      onClick={() => setActiveTab('code')}
                    >
                      <Code className="w-3.5 h-3.5" />
                      HTML
                    </button>
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'testdata'
                          ? 'border-botica-600 text-botica-700'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                      onClick={() => setActiveTab('testdata')}
                    >
                      <Braces className="w-3.5 h-3.5" />
                      Dados de Teste
                    </button>
                  </div>

                  {/* Tab content */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    {activeTab === 'code' ? (
                      <CodeEditor
                        value={templateHtml}
                        onChange={setTemplateHtml}
                        theme={editorTheme}
                        onToggleTheme={() =>
                          setEditorTheme((t) => (t === 'dark' ? 'light' : 'dark'))
                        }
                        onMount={(editor) => {
                          editorRef.current = editor
                        }}
                      />
                    ) : (
                      <TestDataEditor
                        value={testDataJson}
                        onChange={setTestDataJson}
                        theme={editorTheme}
                      />
                    )}
                  </div>
                </div>

                {/* ── Drag handle ───────────────────────────────────── */}
                <div
                  className="w-1.5 bg-slate-200 hover:bg-botica-400 cursor-col-resize flex-shrink-0 transition-colors"
                  onMouseDown={() => setIsDragging(true)}
                />

                {/* ── Right panel (preview) ─────────────────────────── */}
                <div
                  className="flex flex-col min-h-0 bg-white"
                  style={{ width: `${100 - editorWidth}%` }}
                >
                  {/* Preview toolbar */}
                  <div className="flex items-center gap-1 px-2 py-1 border-b border-slate-200 bg-slate-50">
                    <span className="text-[10px] font-medium text-slate-500 mr-1">PREVIEW</span>

                    {/* Device selection */}
                    {(['desktop', 'tablet', 'mobile'] as PreviewDevice[]).map((device) => {
                      const Icon = device === 'desktop' ? Monitor : device === 'tablet' ? Tablet : Smartphone
                      return (
                        <button
                          key={device}
                          onClick={() => setPreviewDevice(device)}
                          className={`p-1 rounded cursor-pointer ${
                            previewDevice === device
                              ? 'bg-botica-100 text-botica-700'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title={DEVICE_SIZES[device].label}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      )
                    })}

                    <div className="w-px h-4 bg-slate-200 mx-1" />

                    {/* Dark mode */}
                    <button
                      onClick={() => setPreviewDarkMode((v) => !v)}
                      className={`p-1 rounded cursor-pointer ${
                        previewDarkMode
                          ? 'bg-slate-700 text-yellow-300'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Dark mode preview"
                    >
                      {previewDarkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    </button>

                    {/* Inspector toggle */}
                    <button
                      onClick={() => setInspectorEnabled((v) => !v)}
                      className={`p-1 rounded cursor-pointer ${
                        inspectorEnabled
                          ? 'bg-blue-100 text-blue-600'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                      }`}
                      title={inspectorEnabled ? 'Inspetor ativo' : 'Inspetor inativo'}
                    >
                      {inspectorEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Rendered subject */}
                  {previewSubject && (
                    <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                      <span className="text-[10px] text-slate-400">Subject: </span>
                      <span className="text-xs font-medium text-slate-700">{previewSubject}</span>
                    </div>
                  )}

                  {/* Preview iframe */}
                  <div className="flex-1 min-h-0 flex items-start justify-center overflow-auto p-2 bg-slate-100">
                    <div
                      className={`bg-white shadow-md transition-all duration-200 ${
                        previewDevice !== 'desktop' ? 'border-4 border-slate-300 rounded-xl' : ''
                      }`}
                      style={{
                        width:
                          previewDevice === 'desktop'
                            ? '100%'
                            : `${DEVICE_SIZES[previewDevice].width}px`,
                        maxWidth: '100%',
                        height:
                          previewDevice === 'desktop'
                            ? '100%'
                            : `${DEVICE_SIZES[previewDevice].height}px`,
                      }}
                    >
                      <iframe
                        srcDoc={previewHtml}
                        sandbox="allow-scripts"
                        className="w-full h-full border-0"
                        title="Email Preview"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Context menu ─────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
            onClick={() => {
              handleSelectTemplate(contextMenu.name)
              setContextMenu(null)
            }}
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
            onClick={() => {
              handleDuplicate(contextMenu.name)
              setContextMenu(null)
            }}
          >
            <Copy className="w-3.5 h-3.5" /> Duplicar
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
            onClick={() => {
              handleDelete(contextMenu.name)
              setContextMenu(null)
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        </div>
      )}

      {/* ── Delete confirmation dialog ──────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Excluir Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir o template <strong>"{deleteTarget}"</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Duplicate dialog ────────────────────────────────────────────── */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent onClose={() => setDuplicateDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Duplicar Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Duplicando: <strong>{templates?.find((t) => t.name === duplicateTarget)?.displayName ?? duplicateTarget}</strong>
            </p>
            <div>
              <Label className="text-xs">Nome do novo template</Label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Nome amigável (ex: Promo | Verão)"
                className="mt-1"
              />
              {duplicateName.trim() && (
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  SES: {toSesTemplateName(duplicateName)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDuplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmDuplicate}
              disabled={duplicateMutation.isPending || !duplicateName.trim()}
            >
              {duplicateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Duplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send test email dialog ──────────────────────────────────────── */}
      <Dialog open={sendTestDialogOpen} onOpenChange={setSendTestDialogOpen}>
        <DialogContent onClose={() => setSendTestDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Enviar E-mail de Teste</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">De (remetente verificado)</Label>
              {identities && identities.length > 0 ? (
                <select
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm mt-1"
                >
                  <option value="">Selecione...</option>
                  {identities.map((id) => (
                    <option key={id.identity} value={id.identity}>
                      {id.identity} ({id.type})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="remetente@exemplo.com"
                  className="mt-1"
                />
              )}
            </div>
            <div>
              <Label className="text-xs">Para</Label>
              <Input
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                placeholder="destinatario@exemplo.com"
                className="mt-1"
              />
            </div>
            <div className="bg-slate-50 rounded-md p-3">
              <p className="text-xs text-slate-500">
                O e-mail será renderizado com os dados de teste antes do envio.
              </p>
            </div>
            {sendTestMutation.isError && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                {sendTestMutation.error instanceof Error ? sendTestMutation.error.message : 'Erro ao enviar'}
              </div>
            )}
            {sendTestMutation.isSuccess && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded text-xs text-green-600">
                E-mail enviado com sucesso!
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSendTestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendTest}
              disabled={sendTestMutation.isPending || !toEmail || !fromEmail}
            >
              {sendTestMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              <Send className="w-3 h-3" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Test Data Editor (JSON) ───────────────────────────────────────────────

function TestDataEditor({
  value,
  onChange,
  theme,
}: {
  value: string
  onChange: (v: string) => void
  theme: EditorTheme
}) {
  const [jsonError, setJsonError] = useState<string | null>(null)

  const handleChange = (v: string) => {
    onChange(v)
    try {
      JSON.parse(v)
      setJsonError(null)
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'JSON inválido')
    }
  }

  const bg = theme === 'dark' ? '#1e1e1e' : '#ffffff'
  const fg = theme === 'dark' ? '#d4d4d4' : '#1f2937'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-2 py-1 border-b"
        style={{
          background: theme === 'dark' ? '#252526' : '#f3f4f6',
          borderColor: theme === 'dark' ? '#333' : '#e2e8f0',
        }}
      >
        <span className="text-[10px] opacity-60 flex-1" style={{ color: theme === 'dark' ? '#ccc' : '#555' }}>
          JSON &bull; Dados para renderizar variáveis Handlebars
        </span>
        {jsonError && (
          <span className="text-[10px] text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Erro
          </span>
        )}
        {!jsonError && value.trim() && (
          <span className="text-[10px] text-green-500">✓ Válido</span>
        )}
      </div>

      {/* Textarea */}
      <div className="flex-1 min-h-0 relative">
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          spellCheck={false}
          className="absolute inset-0 w-full h-full resize-none p-3 font-mono text-xs leading-5 outline-none"
          style={{
            background: bg,
            color: fg,
            caretColor: fg,
            tabSize: 2,
          }}
        />
      </div>

      {jsonError && (
        <div
          className="px-3 py-1.5 text-[10px] text-red-400 border-t"
          style={{
            background: theme === 'dark' ? '#2d1f1f' : '#fef2f2',
            borderColor: theme === 'dark' ? '#5c2828' : '#fecaca',
          }}
        >
          {jsonError}
        </div>
      )}
    </div>
  )
}
