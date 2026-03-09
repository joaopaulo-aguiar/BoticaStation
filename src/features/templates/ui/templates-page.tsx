import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  FileText, Plus, Search, Save, Send, Copy, Trash2, Eye, Code, EyeOff,
  MoreVertical, RefreshCw, AlertCircle, Check, History,
  Smartphone, Monitor, type LucideIcon, PanelLeftClose, PanelLeft,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Label } from '@/shared/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import {
  useTemplatesList, useTemplateDetail, useSaveTemplate,
  useDeleteTemplate, useDuplicateTemplate, useSendTestEmail,
  useTemplateVersions,
} from '../hooks/use-templates'
import { useDefaultConfigurationSet, useConfigurationSets, useSenderProfiles } from '@/features/settings/hooks/use-settings'
import { slugifyTemplateName } from '../api/templates-api'
import { renderHandlebars, safeParseJsonObject } from '../lib/handlebars-lite'
import { htmlToPlainText, extractTemplateVariables } from '../lib/html-to-text'
import { instrumentHtmlForMapping, type NodeLocationMap } from '../lib/instrument-html'
import { buildPreviewSrcDoc } from '../lib/preview-srcdoc'
import { CodeEditor } from './code-editor'
import type { TemplateSummary, BackupVersion } from '../types'

// ── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'code' | 'preview' | 'split'
type PreviewDevice = 'desktop' | 'mobile'

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  template: TemplateSummary | null
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

function TemplateSidebar({
  templates,
  isLoading,
  selected,
  search,
  onSearchChange,
  onSelect,
  onNew,
  onRefresh,
  onContextMenu,
}: {
  templates: TemplateSummary[]
  isLoading: boolean
  selected: string | null
  search: string
  onSearchChange: (s: string) => void
  onSelect: (name: string) => void
  onNew: () => void
  onRefresh: () => void
  onContextMenu: (e: React.MouseEvent, t: TemplateSummary) => void
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return templates
    const q = search.toLowerCase()
    return templates.filter(
      (t) => t.displayName.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
    )
  }, [templates, search])

  return (
    <aside className="w-96 border-r border-slate-200 bg-white flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-botica-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-800">E-mails</h2>
              <p className="text-[10px] text-slate-400">Gerenciamento de e-mails para campanhas</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Buscar e-mail..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button variant="outline" size="icon" onClick={onRefresh} title="Atualizar" className="h-8 w-8 shrink-0">
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </Button>
          <Button size="icon" onClick={onNew} title="Novo E-mail" className="h-8 w-8 shrink-0">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Sort info */}
      <div className="px-3 py-1 text-[10px] text-slate-400 border-b border-slate-50">
        ↕ Ordenar: A → Z
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-xs text-slate-400 text-center">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center">
            {search ? 'Nenhum resultado' : 'Nenhum e-mail'}
          </div>
        ) : (
          filtered.map((t) => (
            <button
              key={t.name}
              onClick={() => onSelect(t.name)}
              onContextMenu={(e) => onContextMenu(e, t)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 cursor-pointer',
                selected === t.name && 'bg-botica-50 border-l-2 border-l-botica-500',
              )}
            >
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-700 truncate text-xs">{t.displayName}</div>
                <div className="text-[10px] text-slate-400 truncate">{t.name}</div>
              </div>
              {t.updatedAt && (
                <span className="text-[10px] text-slate-300 shrink-0">
                  {new Date(t.updatedAt).toLocaleDateString('pt-BR')}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer count */}
      <div className="px-3 py-1.5 border-t border-slate-100 text-[10px] text-slate-400">
        {filtered.length} e-mail{filtered.length !== 1 ? 's' : ''}
      </div>
    </aside>
  )
}

// ── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenuOverlay({
  state,
  onClose,
  actions,
}: {
  state: ContextMenuState
  onClose: () => void
  actions: { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean }[]
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (state.visible) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [state.visible, onClose])

  if (!state.visible) return null

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{ left: state.x, top: state.y }}
    >
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors cursor-pointer',
              action.danger && 'text-red-600 hover:bg-red-50',
            )}
            onClick={() => { action.onClick(); onClose() }}
          >
            <Icon className="w-3.5 h-3.5" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Preview Frame ────────────────────────────────────────────────────────────

function PreviewFrame({
  srcDoc,
  device,
  onElementClick,
}: {
  srcDoc: string
  device: PreviewDevice
  onElementClick?: (nodeId: string) => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'vm-preview-click' && e.data?.id) {
        onElementClick?.(e.data.id)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [onElementClick])

  return (
    <div className="flex-1 flex items-start justify-center bg-slate-100 p-4 overflow-auto">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title="Preview"
        sandbox="allow-scripts"
        className={cn(
          'bg-white border border-slate-200 rounded shadow-sm transition-all duration-300',
          device === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full max-w-[800px] h-full min-h-[600px]',
        )}
      />
    </div>
  )
}

// ── Version History Dialog ───────────────────────────────────────────────────

function VersionHistoryDialog({
  open,
  onOpenChange,
  versions,
  isLoading,
  onRestore,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  versions: BackupVersion[]
  isLoading: boolean
  onRestore: (version: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Histórico de Versões</DialogTitle>
          <DialogDescription>Selecione uma versão para restaurar</DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-400">Carregando...</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Nenhuma versão encontrada</div>
          ) : (
            versions.map((v) => (
              <div
                key={v.version}
                className="flex items-center justify-between py-2 px-1"
              >
                <div>
                  <div className="text-sm font-medium text-slate-700">
                    {new Date(v.lastModified).toLocaleString('pt-BR')}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {(v.size / 1024).toFixed(1)}KB · v{v.version}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestore(v.version)}
                >
                  Restaurar
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function TemplatesPage({ embedded }: { embedded?: boolean } = {}) {

  // ── List & detail ──
  const { data: templates = [], isLoading: isListLoading } = useTemplatesList()
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const { data: detail, isLoading: isDetailLoading } = useTemplateDetail(selectedName)
  const { data: versions = [], isLoading: isVersionsLoading } = useTemplateVersions(selectedName)

  // ── Mutations ──
  const saveTemplate = useSaveTemplate()
  const deleteTemplate = useDeleteTemplate()
  const duplicateTemplate = useDuplicateTemplate()
  const sendTestEmail = useSendTestEmail()
  const { data: defaultConfigSet } = useDefaultConfigurationSet()
  const { data: configSets = [] } = useConfigurationSets()
  const { data: senderProfiles = [] } = useSenderProfiles()

  // ── Editor state ──
  const [displayName, setDisplayName] = useState('')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')
  const [testDataJson, setTestDataJson] = useState('{}')
  const [isDirty, setIsDirty] = useState(false)

  // ── UI state ──
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop')
  const [showTestData, setShowTestData] = useState(false)
  const [inspectorEnabled, setInspectorEnabled] = useState(true)
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol, setCursorCol] = useState(1)

  // ── Dialog state ──
  const [newTemplateDialog, setNewTemplateDialog] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [duplicateDialog, setDuplicateDialog] = useState(false)
  const [duplicateNewName, setDuplicateNewName] = useState('')
  const [duplicateSource, setDuplicateSource] = useState<string | null>(null)
  const [testEmailDialog, setTestEmailDialog] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState('')
  const [testConfigSet, setTestConfigSet] = useState('')
  const [testSender, setTestSender] = useState('')
  const [versionHistoryDialog, setVersionHistoryDialog] = useState(false)

  const openTestEmailDialog = useCallback(() => {
    if (!testSender && senderProfiles.length > 0) setTestSender(senderProfiles[0].id)
    setTestEmailDialog(true)
  }, [testSender, senderProfiles])

  // ── Context menu ──
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, template: null,
  })

  // ── Notifications ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ── Map for inspector ──
  const nodeMapRef = useRef<NodeLocationMap>({})

  // ── Load detail into editor ──
  useEffect(() => {
    if (detail) {
      setDisplayName(detail.displayName ?? detail.name)
      setSubject(detail.subject)
      setHtml(detail.html)
      setTestDataJson(detail.testData ? JSON.stringify(detail.testData, null, 2) : '{}')
      setIsDirty(false)
    }
  }, [detail])

  // ── Mark dirty ──
  const handleHtmlChange = useCallback((val: string) => {
    setHtml(val)
    setIsDirty(true)
  }, [])
  const handleSubjectChange = useCallback((val: string) => {
    setSubject(val)
    setIsDirty(true)
  }, [])

  // ── Computed preview ──
  const testData = useMemo(() => safeParseJsonObject(testDataJson), [testDataJson])
  const renderedHtml = useMemo(() => renderHandlebars(html, testData), [html, testData])
  const { instrumentedHtml, nodeMap } = useMemo(() => {
    if (!inspectorEnabled) return { instrumentedHtml: renderedHtml, nodeMap: {} }
    const result = instrumentHtmlForMapping(renderedHtml)
    return { instrumentedHtml: result.html, nodeMap: result.map }
  }, [renderedHtml, inspectorEnabled])

  useEffect(() => { nodeMapRef.current = nodeMap }, [nodeMap])

  const previewSrcDoc = useMemo(
    () => buildPreviewSrcDoc(instrumentedHtml, { inspectorEnabled }),
    [instrumentedHtml, inspectorEnabled],
  )

  const templateVariables = useMemo(() => extractTemplateVariables(html, subject), [html, subject])

  // ── Handlers ──

  const handleSelect = useCallback((name: string) => {
    if (isDirty && selectedName) {
      if (!window.confirm('Há alterações não salvas. Deseja descartar?')) return
    }
    setSelectedName(name)
  }, [isDirty, selectedName])

  const handleSave = useCallback(async () => {
    if (!selectedName) return
    try {
      const text = htmlToPlainText(html)
      await saveTemplate.mutateAsync({
        name: selectedName,
        displayName,
        subject,
        html,
        text,
        testData: testDataJson !== '{}' ? testDataJson : undefined,
      })
      setIsDirty(false)
      showToast('E-mail salvo com sucesso!')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar', 'error')
    }
  }, [selectedName, displayName, subject, html, testDataJson, saveTemplate, showToast])

  const handleNewTemplate = useCallback(async () => {
    const friendly = newTemplateName.trim()
    if (!friendly) return
    const slug = slugifyTemplateName(friendly)
    if (!slug) return
    try {
      await saveTemplate.mutateAsync({
        name: slug,
        displayName: friendly,
        subject: 'Novo Template',
        html: '<html>\n<head>\n  <meta charset="utf-8">\n</head>\n<body>\n  <h1>{{titulo}}</h1>\n  <p>Olá {{nome}},</p>\n</body>\n</html>',
        text: '',
      })
      setNewTemplateName('')
      setNewTemplateDialog(false)
      setSelectedName(slug)
      showToast('E-mail criado!')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar e-mail', 'error')
    }
  }, [newTemplateName, saveTemplate, showToast])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteTemplate.mutateAsync(deleteTarget)
      if (selectedName === deleteTarget) {
        setSelectedName(null)
        setSubject('')
        setHtml('')
        setIsDirty(false)
      }
      setDeleteConfirmDialog(false)
      setDeleteTarget(null)
      showToast('E-mail excluído')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir', 'error')
    }
  }, [deleteTarget, deleteTemplate, selectedName, showToast])

  const handleDuplicate = useCallback(async () => {
    const friendly = duplicateNewName.trim()
    if (!duplicateSource || !friendly) return
    const slug = slugifyTemplateName(friendly)
    if (!slug) return
    try {
      await duplicateTemplate.mutateAsync({
        sourceName: duplicateSource,
        newName: slug,
        newDisplayName: friendly,
      })
      setDuplicateDialog(false)
      setDuplicateNewName('')
      setDuplicateSource(null)
      showToast('E-mail duplicado!')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao duplicar', 'error')
    }
  }, [duplicateSource, duplicateNewName, duplicateTemplate, showToast])

  const handleSendTest = useCallback(async () => {
    if (!selectedName || !testEmailAddress.trim()) return
    try {
      const configSet = testConfigSet || defaultConfigSet || undefined
      const sender = senderProfiles.find((s) => s.id === testSender)
      const fromAddr = sender ? `${sender.name} <${sender.email}>` : undefined
      await sendTestEmail.mutateAsync({
        templateName: selectedName,
        toAddress: testEmailAddress.trim(),
        testData: testDataJson !== '{}' ? testDataJson : undefined,
        configurationSet: configSet,
        fromAddress: fromAddr,
        tags: JSON.stringify({ campanha: 'Teste_de_Envio' }),
      })
      setTestEmailDialog(false)
      showToast('E-mail de teste enviado!')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao enviar', 'error')
    }
  }, [selectedName, testEmailAddress, testDataJson, testConfigSet, testSender, senderProfiles, sendTestEmail, defaultConfigSet, showToast])

  const handleContextMenu = useCallback((e: React.MouseEvent, t: TemplateSummary) => {
    e.preventDefault()
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, template: t })
  }, [])

  const handleInspectorClick = useCallback((nodeId: string) => {
    const loc = nodeMapRef.current[nodeId]
    if (loc) {
      setCursorLine(loc.startLine)
      setCursorCol(loc.startCol)
      setViewMode('split')
    }
  }, [])

  // ── Keyboard shortcut ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (selectedName && isDirty) handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedName, isDirty, handleSave])

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasTemplate = !!selectedName

  return (
    <div className={cn('flex bg-slate-50', embedded ? 'h-full' : 'h-[calc(100vh-4rem-2.25rem)] -m-4 lg:-m-6')}>
      {/* Sidebar */}
      {sidebarVisible && (
        <TemplateSidebar
          templates={templates}
          isLoading={isListLoading}
          selected={selectedName}
          search={sidebarSearch}
          onSearchChange={setSidebarSearch}
          onSelect={handleSelect}
          onNew={() => setNewTemplateDialog(true)}
          onRefresh={() => {}}
          onContextMenu={handleContextMenu}
        />
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-white">
          {/* Sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            title={sidebarVisible ? 'Ocultar sidebar' : 'Mostrar sidebar'}
            className="h-8 w-8 shrink-0"
          >
            {sidebarVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </Button>

          {hasTemplate ? (
            <>
              {/* Name (display name - read-only label) */}
              <div className="flex items-center gap-1.5 min-w-0 shrink-0 max-w-[50%]">
                <span className="text-xs font-medium text-slate-500 shrink-0">Nome:</span>
                <span className="text-xs font-semibold text-slate-700 truncate" title={displayName}>
                  {displayName}
                </span>
              </div>

              <div className="w-px h-5 bg-slate-200 shrink-0" />

              {/* Subject */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-500 shrink-0">Assunto:</span>
                <Input
                  value={subject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  placeholder="Assunto do e-mail..."
                  className="h-7 text-xs flex-1"
                />
              </div>
              {/* View Mode Switches */}
              <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                <ToolbarToggle
                  active={viewMode === 'code'}
                  onClick={() => setViewMode('code')}
                  icon={Code}
                  title="Código"
                />
                <ToolbarToggle
                  active={viewMode === 'split'}
                  onClick={() => setViewMode('split')}
                  icon={Eye}
                  title="Dividido"
                />
                <ToolbarToggle
                  active={viewMode === 'preview'}
                  onClick={() => setViewMode('preview')}
                  icon={Monitor}
                  title="Preview"
                />
              </div>
              {/* Device toggle */}
              {viewMode !== 'code' && (
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                  <ToolbarToggle
                    active={previewDevice === 'desktop'}
                    onClick={() => setPreviewDevice('desktop')}
                    icon={Monitor}
                    title="Desktop"
                  />
                  <ToolbarToggle
                    active={previewDevice === 'mobile'}
                    onClick={() => setPreviewDevice('mobile')}
                    icon={Smartphone}
                    title="Mobile"
                  />
                </div>
              )}
              {/* Inspector */}
              {viewMode !== 'code' && (
                <Button
                  variant={inspectorEnabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setInspectorEnabled(!inspectorEnabled)}
                  title="Inspetor de elementos"
                >
                  {inspectorEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </Button>
              )}
              {/* Test data */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTestData(!showTestData)}
                title="Dados de teste"
              >
                {'{}'}
              </Button>
              {/* History */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVersionHistoryDialog(true)}
                title="Histórico de versões"
              >
                <History className="w-3.5 h-3.5" />
              </Button>
              {/* More */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setContextMenu({
                    visible: true,
                    x: window.innerWidth - 200,
                    y: 100,
                    template: templates.find(t => t.name === selectedName) ?? null,
                  })
                }}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
              {/* Send test */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openTestEmailDialog()}
                title="Enviar e-mail de teste"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
              {/* Save */}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || saveTemplate.isPending}
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                {saveTemplate.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              {isDirty && (
                <Badge className="bg-amber-100 text-amber-700 text-[10px]">Alterado</Badge>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-400 flex-1">
              <FileText className="w-4 h-4" />
              Selecione ou crie um e-mail
            </div>
          )}
        </div>

        {/* Editor + Preview area */}
        {hasTemplate ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex min-h-0">
              {/* Code Editor / Test Data (same panel, toggled) */}
              {(viewMode === 'code' || viewMode === 'split') && (
                <div className={cn('flex flex-col min-h-0', viewMode === 'split' ? 'w-1/2 border-r border-slate-200' : 'flex-1')}>
                  {isDetailLoading ? (
                    <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] text-slate-400 text-sm">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Carregando...
                    </div>
                  ) : showTestData ? (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-600">Dados de Teste (JSON)</span>
                          {templateVariables.length > 0 && (
                            <span className="text-[10px] text-slate-400">
                              Variáveis: {templateVariables.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        <CodeEditor
                          value={testDataJson}
                          onChange={setTestDataJson}
                          language="json"
                          height="100%"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0">
                      <CodeEditor
                        value={html}
                        onChange={handleHtmlChange}
                        onCursorPositionChange={(l, c) => { setCursorLine(l); setCursorCol(c) }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className={cn('flex flex-col min-h-0', viewMode === 'split' ? 'w-1/2' : 'flex-1')}>
                  <PreviewFrame
                    srcDoc={previewSrcDoc}
                    device={previewDevice}
                    onElementClick={handleInspectorClick}
                  />
                </div>
              )}
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-3 py-1 border-t border-slate-200 bg-white text-[10px] text-slate-400">
              <div className="flex items-center gap-3">
                <span>Ln {cursorLine}, Col {cursorCol}</span>
                <span>HTML · UTF-8</span>
                {templateVariables.length > 0 && (
                  <span>{templateVariables.length} variáveis</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span>{(new Blob([html]).size / 1024).toFixed(1)}KB</span>
                <span>Ctrl+S para salvar</span>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-botica-100 text-botica-600 mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">E-mails</h3>
              <p className="text-sm text-slate-500 mb-4">
                Selecione um e-mail na barra lateral ou crie um novo para começar a editar.
              </p>
              <Button onClick={() => setNewTemplateDialog(true)}>
                <Plus className="w-4 h-4 mr-1" /> Novo E-mail
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      <ContextMenuOverlay
        state={contextMenu}
        onClose={() => setContextMenu((s) => ({ ...s, visible: false }))}
        actions={[
          {
            label: 'Duplicar',
            icon: Copy,
            onClick: () => {
              if (contextMenu.template) {
                setDuplicateSource(contextMenu.template.name)
                setDuplicateNewName(contextMenu.template.displayName + ' - Cópia')
                setDuplicateDialog(true)
              }
            },
          },
          {
            label: 'Enviar teste',
            icon: Send,
            onClick: () => {
              if (contextMenu.template) {
                setSelectedName(contextMenu.template.name)
                openTestEmailDialog()
              }
            },
          },
          {
            label: 'Excluir',
            icon: Trash2,
            danger: true,
            onClick: () => {
              if (contextMenu.template) {
                setDeleteTarget(contextMenu.template.name)
                setDeleteConfirmDialog(true)
              }
            },
          },
        ]}
      />

      {/* ── Dialogs ── */}

      {/* New Template */}
      <Dialog open={newTemplateDialog} onOpenChange={setNewTemplateDialog}>
        <DialogContent onClose={() => setNewTemplateDialog(false)}>
          <DialogHeader>
            <DialogTitle>Novo E-mail</DialogTitle>
            <DialogDescription>
              Digite um nome para identificar este e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-name" className="text-sm font-medium text-slate-700">Nome do E-mail</Label>
              <Input
                id="new-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="mt-1.5"
                autoFocus
              />
            </div>
            {newTemplateName.trim() && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Identificador</span>
                  <span className="text-[9px] text-slate-400">(auto-gerado)</span>
                </div>
                <code className="text-xs text-botica-700 font-mono block">{slugifyTemplateName(newTemplateName.trim())}</code>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTemplateDialog(false)}>Cancelar</Button>
            <Button onClick={handleNewTemplate} disabled={!newTemplateName.trim() || !slugifyTemplateName(newTemplateName.trim()) || saveTemplate.isPending}>
              {saveTemplate.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirmDialog} onOpenChange={setDeleteConfirmDialog}>
        <DialogContent onClose={() => setDeleteConfirmDialog(false)}>
          <DialogHeader>
            <DialogTitle>Excluir E-mail</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteTarget}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteTemplate.isPending}>
              {deleteTemplate.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate */}
      <Dialog open={duplicateDialog} onOpenChange={setDuplicateDialog}>
        <DialogContent onClose={() => setDuplicateDialog(false)}>
          <DialogHeader>
            <DialogTitle>Duplicar E-mail</DialogTitle>
            <DialogDescription>Informe o nome para a cópia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dup-name" className="text-sm font-medium text-slate-700">Nome do E-mail</Label>
              <Input
                id="dup-name"
                value={duplicateNewName}
                onChange={(e) => setDuplicateNewName(e.target.value)}
                className="mt-1.5"
                autoFocus
              />
            </div>
            {duplicateNewName.trim() && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Identificador</span>
                  <span className="text-[9px] text-slate-400">(auto-gerado)</span>
                </div>
                <code className="text-xs text-botica-700 font-mono block">{slugifyTemplateName(duplicateNewName.trim())}</code>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialog(false)}>Cancelar</Button>
            <Button onClick={handleDuplicate} disabled={!duplicateNewName.trim() || !slugifyTemplateName(duplicateNewName.trim()) || duplicateTemplate.isPending}>
              {duplicateTemplate.isPending ? 'Duplicando...' : 'Duplicar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Test Email */}
      <Dialog open={testEmailDialog} onOpenChange={setTestEmailDialog}>
        <DialogContent onClose={() => setTestEmailDialog(false)} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar E-mail de Teste</DialogTitle>
            <DialogDescription>O template será renderizado com os dados de teste atuais.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Sender selection */}
            <div>
              <Label className="text-sm font-medium">Remetente</Label>
              {senderProfiles.length === 0 ? (
                <p className="text-xs text-amber-600 mt-1">Configure um perfil de remetente em Configurações.</p>
              ) : (
                <div className="mt-1.5 space-y-1.5">
                  {senderProfiles.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setTestSender(s.id)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all cursor-pointer',
                        s.id === testSender
                          ? 'border-botica-500 bg-botica-50'
                          : 'border-slate-200 hover:border-slate-300',
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0',
                        s.id === testSender ? 'bg-botica-600 text-white' : 'bg-slate-200 text-slate-600',
                      )}>
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                        <p className="text-xs text-slate-500 truncate">{s.email}</p>
                      </div>
                      {s.id === testSender && <Check className="w-4 h-4 text-botica-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recipient */}
            <div>
              <Label htmlFor="test-email" className="text-sm font-medium">Destinatário</Label>
              <Input
                id="test-email"
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="teste@exemplo.com"
                className="mt-1.5 h-10"
              />
            </div>

            {/* Configuration Set */}
            <div>
              <Label htmlFor="test-config-set" className="text-sm font-medium">Configuration Set</Label>
              <select
                id="test-config-set"
                value={testConfigSet}
                onChange={(e) => setTestConfigSet(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                <option value="">{defaultConfigSet ? `Padrão: ${defaultConfigSet}` : 'Nenhum (padrão da conta)'}</option>
                {configSets.map((cs) => (
                  <option key={cs} value={cs}>{cs}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Se não selecionado, será usado o configuration set padrão das configurações.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestEmailDialog(false)}>Cancelar</Button>
            <Button onClick={handleSendTest} disabled={!testEmailAddress.trim() || !testSender || sendTestEmail.isPending}>
              <Send className="w-3.5 h-3.5 mr-1" />
              {sendTestEmail.isPending ? 'Enviando...' : 'Enviar Teste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History */}
      <VersionHistoryDialog
        open={versionHistoryDialog}
        onOpenChange={setVersionHistoryDialog}
        versions={versions}
        isLoading={isVersionsLoading}
        onRestore={async (version) => {
          try {
            const { getTemplateVersion } = await import('../api/templates-api')
            const vDetail = await getTemplateVersion(selectedName!, version)
            setHtml(vDetail.html)
            setSubject(vDetail.subject)
            setIsDirty(true)
            setVersionHistoryDialog(false)
            showToast('Versão restaurada. Salve para confirmar.')
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Erro ao restaurar', 'error')
          }
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-4 right-4 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all',
            toast.type === 'success' ? 'bg-botica-600 text-white' : 'bg-red-600 text-white',
          )}
        >
          {toast.type === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ── Helper component ─────────────────────────────────────────────────────────

function ToolbarToggle({
  active,
  onClick,
  icon: Icon,
  title,
}: {
  active: boolean
  onClick: () => void
  icon: LucideIcon
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'flex items-center justify-center w-8 h-8 transition-colors cursor-pointer',
        active ? 'bg-botica-100 text-botica-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}
