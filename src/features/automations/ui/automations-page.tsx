/**
 * Automations Page — Full workflow management with visual builder.
 *
 * Features:
 * - List view: cards with status, stats, context menu
 * - Create/edit view: workflow canvas + node config panel
 * - Template gallery for quick start
 * - Activate / pause / archive controls
 */
import { useState, useMemo, useCallback } from 'react'
import {
  Workflow,
  Plus,
  Search,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Eye,
  Play,
  Pause,
  Archive,
  Copy,
  MoreVertical,
  ArrowLeft,
  Save,
  Layout,
  Zap,
  Clock,
  GitBranch,
  Mail,
  Tag,
  Users,
  Globe,
  MessageSquare,
  FileEdit,
  X,
  ChevronDown,
  ShoppingCart,
  Wallet,
  Bell,
} from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  useDuplicateAutomation,
  useActivateAutomation,
  usePauseAutomation,
} from '../hooks/use-automations'
import { WorkflowCanvas } from './workflow-canvas'
import {
  type Automation,
  type AutomationNode,
  type AutomationStatus,
  type AutomationFormData,
  type TriggerConfig,
  type ActionConfig,
  type ConditionConfig,
  type DelayConfig,
  type TriggerType,
  type ActionType,
  type ConditionType,
  type DelayType,
  type DelayUnit,
  TRIGGER_LABELS,
  TRIGGER_DESCRIPTIONS,
  ACTION_LABELS,
  CONDITION_LABELS,
  DELAY_LABELS,
  DELAY_UNIT_LABELS,
  AUTOMATION_TEMPLATES,
} from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────

type PageView = 'list' | 'create' | 'edit' | 'detail'

const STATUS_LABELS: Record<AutomationStatus, string> = {
  draft: 'Rascunho',
  active: 'Ativa',
  paused: 'Pausada',
  archived: 'Arquivada',
}

const STATUS_COLORS: Record<AutomationStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  archived: 'bg-slate-100 text-slate-500',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AutomationsPage() {
  // ── View ──
  const [view, setView] = useState<PageView>('list')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | AutomationStatus>('all')
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null)

  // ── Form ──
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formNodes, setFormNodes] = useState<AutomationNode[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // ── Dialogs ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [contextMenuId, setContextMenuId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  // ── Queries ──
  const { data: automations = [], isLoading, error } = useAutomations()
  const createMut = useCreateAutomation()
  const updateMut = useUpdateAutomation()
  const deleteMut = useDeleteAutomation()
  const duplicateMut = useDuplicateAutomation()
  const activateMut = useActivateAutomation()
  const pauseMut = usePauseAutomation()

  // ── Filtered list ──
  const filteredAutomations = useMemo(() => {
    let result = automations
    if (filterStatus !== 'all') result = result.filter((a) => a.status === filterStatus)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q),
      )
    }
    return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [automations, filterStatus, search])

  // ── Helpers ──

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormNodes([])
    setSelectedNodeId(null)
  }

  const openCreate = () => {
    resetForm()
    setShowTemplates(true)
  }

  const startFromTemplate = (templateId: string) => {
    const tpl = AUTOMATION_TEMPLATES.find((t) => t.id === templateId)
    if (tpl) {
      setFormName(tpl.name)
      setFormDescription(tpl.description)
      setFormNodes(structuredClone(tpl.nodes))
    }
    setShowTemplates(false)
    setView('create')
  }

  const startBlank = () => {
    resetForm()
    setShowTemplates(false)
    setView('create')
  }

  const openEdit = (automation: Automation) => {
    setSelectedAutomation(automation)
    setFormName(automation.name)
    setFormDescription(automation.description || '')
    setFormNodes(structuredClone(automation.nodes))
    setSelectedNodeId(null)
    setView('edit')
  }

  const openDetail = (automation: Automation) => {
    setSelectedAutomation(automation)
    setView('detail')
  }

  const handleSave = async () => {
    const data: AutomationFormData = {
      name: formName,
      description: formDescription,
      nodes: formNodes,
    }

    if (view === 'create') {
      await createMut.mutateAsync(data)
    } else if (view === 'edit' && selectedAutomation) {
      await updateMut.mutateAsync({ id: selectedAutomation.id, data })
    }

    setView('list')
    resetForm()
  }

  const handleDelete = async () => {
    if (!selectedAutomation) return
    await deleteMut.mutateAsync(selectedAutomation.id)
    setShowDeleteConfirm(false)
    setSelectedAutomation(null)
    setView('list')
  }

  const selectedNode = useMemo(
    () => formNodes.find((n) => n.id === selectedNodeId) ?? null,
    [formNodes, selectedNodeId],
  )

  const updateNodeConfig = useCallback((nodeId: string, updates: Partial<AutomationNode>) => {
    setFormNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
    )
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  if (view === 'create' || view === 'edit') {
    return (
      <div className="flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center gap-4 p-4 border-b border-slate-200 bg-white">
          <button
            onClick={() => { setView('list'); resetForm() }}
            className="p-1 rounded hover:bg-slate-100 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Nome da Automação"
              className="text-lg font-bold text-slate-800 bg-transparent border-none outline-none w-full"
            />
            <input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              className="text-xs text-slate-500 bg-transparent border-none outline-none w-full mt-0.5"
            />
          </div>
          <Button
            onClick={handleSave}
            disabled={!formName.trim() || createMut.isPending || updateMut.isPending}
            className="bg-botica-primary hover:bg-botica-primary/90 text-white gap-1.5"
          >
            {(createMut.isPending || updateMut.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar
          </Button>
        </div>

        {/* Editor area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-slate-50/50">
            <WorkflowCanvas
              nodes={formNodes}
              onChange={setFormNodes}
              onSelectNode={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
            />
          </div>

          {/* Config panel */}
          {selectedNode && (
            <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto">
              <NodeConfigPanel
                node={selectedNode}
                onChange={(updates) => updateNodeConfig(selectedNode.id, updates)}
                onClose={() => setSelectedNodeId(null)}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (view === 'detail' && selectedAutomation) {
    return <AutomationDetail
      automation={selectedAutomation}
      onBack={() => { setView('list') }}
      onEdit={() => openEdit(selectedAutomation)}
      onActivate={() => activateMut.mutate(selectedAutomation.id)}
      onPause={() => pauseMut.mutate(selectedAutomation.id)}
      nodes={selectedAutomation.nodes}
    />
  }

  // ── List view ──
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Workflow className="w-6 h-6 text-botica-primary" />
            Automações
          </h1>
          <p className="text-sm text-slate-500 mt-1">Crie fluxos para acompanhar e engajar seus contatos automaticamente</p>
        </div>
        <Button onClick={openCreate} className="bg-botica-primary hover:bg-botica-primary/90 text-white gap-1.5">
          <Plus className="w-4 h-4" /> Criar Automação
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar automações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'draft', 'active', 'paused', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer',
                filterStatus === s
                  ? 'bg-botica-primary text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {s === 'all' ? 'Todas' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-botica-primary" />
          <span className="ml-2 text-sm text-slate-500">Carregando automações…</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20 text-red-500 gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Erro ao carregar automações</span>
        </div>
      ) : filteredAutomations.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Workflow className="w-12 h-12 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">Nenhuma automação encontrada</p>
          <p className="text-xs text-slate-400 mt-1">Crie sua primeira automação para engajar contatos automaticamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAutomations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onView={() => openDetail(automation)}
              onEdit={() => openEdit(automation)}
              onDuplicate={() => duplicateMut.mutate(automation.id)}
              onDelete={() => { setSelectedAutomation(automation); setShowDeleteConfirm(true) }}
              onActivate={() => activateMut.mutate(automation.id)}
              onPause={() => pauseMut.mutate(automation.id)}
              contextOpen={contextMenuId === automation.id}
              onContextToggle={() => setContextMenuId(contextMenuId === automation.id ? null : automation.id)}
            />
          ))}
        </div>
      )}

      {/* Template Gallery Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Automação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Blank */}
            <button
              onClick={startBlank}
              className="w-full p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-botica-400 hover:bg-botica-50/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100">
                  <Layout className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Em branco</p>
                  <p className="text-xs text-slate-500">Comece do zero e monte seu fluxo de automação</p>
                </div>
              </div>
            </button>

            {/* Templates */}
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modelos prontos</p>
            <div className="grid grid-cols-2 gap-3">
              {AUTOMATION_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => startFromTemplate(tpl.id)}
                  className="p-4 rounded-lg border border-slate-200 hover:border-botica-300 hover:bg-botica-50/30 transition-colors text-left cursor-pointer"
                >
                  <span className="text-2xl">{tpl.icon}</span>
                  <p className="text-sm font-bold text-slate-700 mt-2">{tpl.name}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
                  <Badge className="mt-2 text-[10px]">{tpl.nodes.length} etapas</Badge>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Automação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir a automação <strong>{selectedAutomation?.name}</strong>?
            Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close context menu when clicking outside */}
      {contextMenuId && (
        <div className="fixed inset-0 z-30" onClick={() => setContextMenuId(null)} />
      )}
    </div>
  )
}

// ─── Automation Card ─────────────────────────────────────────────────────────

function AutomationCard({
  automation,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onActivate,
  onPause,
  contextOpen,
  onContextToggle,
}: {
  automation: Automation
  onView: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onActivate: () => void
  onPause: () => void
  contextOpen: boolean
  onContextToggle: () => void
}) {
  const triggerNode = automation.nodes.find((n) => n.type === 'trigger')
  const triggerLabel = triggerNode
    ? TRIGGER_LABELS[(triggerNode.config as TriggerConfig).triggerType]
    : 'Sem gatilho'
  const nodeCount = automation.nodes.length

  return (
    <div className="rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 truncate">{automation.name}</h3>
              <Badge className={cn('text-[10px]', STATUS_COLORS[automation.status])}>
                {STATUS_LABELS[automation.status]}
              </Badge>
            </div>
            {automation.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{automation.description}</p>
            )}
          </div>
          <div className="relative">
            <button onClick={onContextToggle} className="p-1 rounded hover:bg-slate-100 cursor-pointer">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
            {contextOpen && (
              <div className="absolute right-0 top-full mt-1 z-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-44">
                <button onClick={onView} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Eye className="w-3.5 h-3.5" /> Visualizar
                </button>
                <button onClick={onEdit} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={onDuplicate} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </button>
                {automation.status === 'draft' || automation.status === 'paused' ? (
                  <button onClick={onActivate} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-green-700 hover:bg-green-50 cursor-pointer">
                    <Play className="w-3.5 h-3.5" /> Ativar
                  </button>
                ) : automation.status === 'active' ? (
                  <button onClick={onPause} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-amber-700 hover:bg-amber-50 cursor-pointer">
                    <Pause className="w-3.5 h-3.5" /> Pausar
                  </button>
                ) : null}
                <div className="border-t border-slate-100 my-1" />
                <button onClick={onDelete} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Zap className="w-3 h-3" />
            <span>{triggerLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <GitBranch className="w-3 h-3" />
            <span>{nodeCount} etapas</span>
          </div>
        </div>

        {automation.stats && (
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] text-slate-400">
              {automation.stats.totalEntered} entradas
            </span>
            <span className="text-[10px] text-slate-400">
              {automation.stats.emailsSent} e-mails
            </span>
          </div>
        )}

        <p className="text-[10px] text-slate-400 mt-2">
          Atualizado em {new Date(automation.updatedAt).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  )
}

// ─── Automation Detail ───────────────────────────────────────────────────────

function AutomationDetail({
  automation,
  onBack,
  onEdit,
  onActivate,
  onPause,
  nodes,
}: {
  automation: Automation
  onBack: () => void
  onEdit: () => void
  onActivate: () => void
  onPause: () => void
  nodes: AutomationNode[]
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 border-b border-slate-200 bg-white">
        <button onClick={onBack} className="p-1 rounded hover:bg-slate-100 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800">{automation.name}</h1>
            <Badge className={cn('text-[10px]', STATUS_COLORS[automation.status])}>
              {STATUS_LABELS[automation.status]}
            </Badge>
          </div>
          {automation.description && (
            <p className="text-xs text-slate-500 mt-0.5">{automation.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {automation.status === 'active' ? (
            <Button variant="outline" onClick={onPause} className="gap-1.5 text-xs">
              <Pause className="w-3.5 h-3.5" /> Pausar
            </Button>
          ) : automation.status !== 'archived' ? (
            <Button variant="outline" onClick={onActivate} className="gap-1.5 text-xs text-green-700 border-green-300 hover:bg-green-50">
              <Play className="w-3.5 h-3.5" /> Ativar
            </Button>
          ) : null}
          <Button onClick={onEdit} className="bg-botica-primary hover:bg-botica-primary/90 text-white gap-1.5 text-xs">
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {automation.stats && (
        <div className="flex items-center gap-6 px-6 py-3 border-b border-slate-100 bg-slate-50">
          <Stat label="Total de Entradas" value={automation.stats.totalEntered} />
          <Stat label="Contatos Ativos" value={automation.stats.activeContacts} />
          <Stat label="Concluídos" value={automation.stats.completedContacts} />
          <Stat label="E-mails Enviados" value={automation.stats.emailsSent} />
        </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
        <WorkflowCanvas
          nodes={nodes}
          onChange={() => {}}
          onSelectNode={() => {}}
          selectedNodeId={null}
          readOnly
        />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-bold text-slate-800">{value.toLocaleString('pt-BR')}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  )
}

// ─── Node Config Panel ───────────────────────────────────────────────────────

function NodeConfigPanel({
  node,
  onChange,
  onClose,
}: {
  node: AutomationNode
  onChange: (updates: Partial<AutomationNode>) => void
  onClose: () => void
}) {
  const updateConfig = (key: string, value: any) => {
    onChange({ config: { ...node.config, [key]: value } })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">Configurar Etapa</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 cursor-pointer">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Common: label */}
      <div>
        <Label className="text-xs">Nome da etapa</Label>
        <Input
          value={node.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="mt-1"
        />
      </div>

      {node.type === 'trigger' && <TriggerConfigPanel config={node.config as TriggerConfig} onChange={updateConfig} />}
      {node.type === 'action' && <ActionConfigPanel config={node.config as ActionConfig} onChange={updateConfig} />}
      {node.type === 'condition' && <ConditionConfigPanel config={node.config as ConditionConfig} onChange={updateConfig} />}
      {node.type === 'delay' && <DelayConfigPanel config={node.config as DelayConfig} onChange={updateConfig} />}
    </div>
  )
}

// ── Trigger Config ───────────────────────────────────────────────────────────

function TriggerConfigPanel({ config, onChange }: { config: TriggerConfig; onChange: (k: string, v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Tipo de Gatilho</Label>
        <select
          value={config.triggerType}
          onChange={(e) => onChange('triggerType', e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          {(Object.entries(TRIGGER_LABELS) as [TriggerType, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <p className="text-[10px] text-slate-400 mt-1">
          {TRIGGER_DESCRIPTIONS[config.triggerType]}
        </p>
      </div>

      {(config.triggerType === 'tag_added' || config.triggerType === 'tag_removed') && (
        <div>
          <Label className="text-xs">Nome da Tag</Label>
          <Input
            value={config.tagName || ''}
            onChange={(e) => onChange('tagName', e.target.value)}
            placeholder="Ex: cliente_vip"
            className="mt-1"
          />
        </div>
      )}

      {config.triggerType === 'segment_entered' && (
        <div>
          <Label className="text-xs">ID da Segmentação</Label>
          <Input
            value={config.segmentId || ''}
            onChange={(e) => onChange('segmentId', e.target.value)}
            placeholder="UUID da segmentação"
            className="mt-1"
          />
        </div>
      )}

      {config.triggerType === 'field_changed' && (
        <div>
          <Label className="text-xs">Campo do contato</Label>
          <Input
            value={config.fieldKey || ''}
            onChange={(e) => onChange('fieldKey', e.target.value)}
            placeholder="Ex: lifecycle_stage"
            className="mt-1"
          />
        </div>
      )}

      {(config.triggerType === 'email_opened' || config.triggerType === 'email_clicked') && (
        <div>
          <Label className="text-xs">ID da Campanha</Label>
          <Input
            value={config.campaignId || ''}
            onChange={(e) => onChange('campaignId', e.target.value)}
            placeholder="UUID da campanha"
            className="mt-1"
          />
        </div>
      )}

      {config.triggerType === 'cashback_expiring' && (
        <div>
          <Label className="text-xs">Dias antes da expiração</Label>
          <Input
            type="number"
            value={config.daysBeforeExpiry ?? 5}
            onChange={(e) => onChange('daysBeforeExpiry', parseInt(e.target.value))}
            min={1}
            className="mt-1"
          />
        </div>
      )}
    </div>
  )
}

// ── Action Config ────────────────────────────────────────────────────────────

function ActionConfigPanel({ config, onChange }: { config: ActionConfig; onChange: (k: string, v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Tipo de Ação</Label>
        <select
          value={config.actionType}
          onChange={(e) => onChange('actionType', e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          {(Object.entries(ACTION_LABELS) as [ActionType, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {config.actionType === 'send_email' && (
        <>
          <div>
            <Label className="text-xs">Nome do Template</Label>
            <Input
              value={config.templateName || ''}
              onChange={(e) => onChange('templateName', e.target.value)}
              placeholder="Nome do template de e-mail"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Assunto</Label>
            <Input
              value={config.subject || ''}
              onChange={(e) => onChange('subject', e.target.value)}
              placeholder="Assunto do e-mail"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">E-mail do remetente</Label>
            <Input
              value={config.senderEmail || ''}
              onChange={(e) => onChange('senderEmail', e.target.value)}
              placeholder="Ex: contato@farmacia.com.br"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Nome do remetente</Label>
            <Input
              value={config.senderName || ''}
              onChange={(e) => onChange('senderName', e.target.value)}
              placeholder="Ex: Farmácia BoticaStation"
              className="mt-1"
            />
          </div>
        </>
      )}

      {config.actionType === 'send_sms' && (
        <div>
          <Label className="text-xs">Mensagem SMS</Label>
          <textarea
            value={config.message || ''}
            onChange={(e) => onChange('message', e.target.value)}
            placeholder="Texto da mensagem SMS"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm min-h-[80px] resize-y"
          />
          <p className="text-[10px] text-slate-400 mt-1">Use &#123;&#123;nome&#125;&#125; para personalizar</p>
        </div>
      )}

      {(config.actionType === 'add_tag' || config.actionType === 'remove_tag') && (
        <div>
          <Label className="text-xs">Nome da Tag</Label>
          <Input
            value={config.tagName || ''}
            onChange={(e) => onChange('tagName', e.target.value)}
            placeholder="Ex: cliente_fiel"
            className="mt-1"
          />
        </div>
      )}

      {config.actionType === 'update_field' && (
        <>
          <div>
            <Label className="text-xs">Campo</Label>
            <Input
              value={config.fieldKey || ''}
              onChange={(e) => onChange('fieldKey', e.target.value)}
              placeholder="Ex: lifecycle_stage"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Novo valor</Label>
            <Input
              value={config.fieldValue || ''}
              onChange={(e) => onChange('fieldValue', e.target.value)}
              placeholder="Valor"
              className="mt-1"
            />
          </div>
        </>
      )}

      {(config.actionType === 'add_to_segment' || config.actionType === 'remove_from_segment') && (
        <div>
          <Label className="text-xs">ID da Segmentação</Label>
          <Input
            value={config.segmentId || ''}
            onChange={(e) => onChange('segmentId', e.target.value)}
            placeholder="UUID da segmentação"
            className="mt-1"
          />
        </div>
      )}

      {config.actionType === 'webhook' && (
        <>
          <div>
            <Label className="text-xs">URL</Label>
            <Input
              value={config.webhookUrl || ''}
              onChange={(e) => onChange('webhookUrl', e.target.value)}
              placeholder="https://api.exemplo.com/webhook"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Método</Label>
            <select
              value={config.webhookMethod || 'POST'}
              onChange={(e) => onChange('webhookMethod', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </div>
        </>
      )}

      {config.actionType === 'notify_team' && (
        <div>
          <Label className="text-xs">Mensagem de notificação</Label>
          <textarea
            value={config.message || ''}
            onChange={(e) => onChange('message', e.target.value)}
            placeholder="Mensagem para a equipe"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm min-h-[80px] resize-y"
          />
        </div>
      )}
    </div>
  )
}

// ── Condition Config ─────────────────────────────────────────────────────────

function ConditionConfigPanel({ config, onChange }: { config: ConditionConfig; onChange: (k: string, v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Tipo de Condição</Label>
        <select
          value={config.conditionType}
          onChange={(e) => onChange('conditionType', e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          {(Object.entries(CONDITION_LABELS) as [ConditionType, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {config.conditionType === 'field_check' && (
        <>
          <div>
            <Label className="text-xs">Campo</Label>
            <Input
              value={config.field || ''}
              onChange={(e) => onChange('field', e.target.value)}
              placeholder="Ex: lifecycle_stage"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Operador</Label>
            <select
              value={config.operator || 'equals'}
              onChange={(e) => onChange('operator', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="equals">Igual a</option>
              <option value="not_equals">Diferente de</option>
              <option value="contains">Contém</option>
              <option value="greater_than">Maior que</option>
              <option value="less_than">Menor que</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <Input
              value={String(config.value ?? '')}
              onChange={(e) => onChange('value', e.target.value)}
              placeholder="Valor"
              className="mt-1"
            />
          </div>
        </>
      )}

      {config.conditionType === 'tag_check' && (
        <div>
          <Label className="text-xs">Nome da Tag</Label>
          <Input
            value={config.tagName || ''}
            onChange={(e) => onChange('tagName', e.target.value)}
            placeholder="Nome da tag como condição"
            className="mt-1"
          />
        </div>
      )}

      {config.conditionType === 'email_activity' && (
        <>
          <div>
            <Label className="text-xs">Atividade</Label>
            <select
              value={config.emailAction || 'opened'}
              onChange={(e) => onChange('emailAction', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="opened">Abriu o e-mail</option>
              <option value="clicked">Clicou em link</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">ID da Campanha</Label>
            <Input
              value={config.campaignId || ''}
              onChange={(e) => onChange('campaignId', e.target.value)}
              placeholder="UUID da campanha"
              className="mt-1"
            />
          </div>
        </>
      )}

      {config.conditionType === 'segment_membership' && (
        <div>
          <Label className="text-xs">ID da Segmentação</Label>
          <Input
            value={config.segmentId || ''}
            onChange={(e) => onChange('segmentId', e.target.value)}
            placeholder="UUID da segmentação"
            className="mt-1"
          />
        </div>
      )}

      {config.conditionType === 'cashback_balance' && (
        <>
          <div>
            <Label className="text-xs">Operador</Label>
            <select
              value={config.balanceOperator || 'greater_than'}
              onChange={(e) => onChange('balanceOperator', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="greater_than">Maior que</option>
              <option value="less_than">Menor que</option>
              <option value="equals">Igual a</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Valor (R$)</Label>
            <Input
              type="number"
              value={config.balanceValue ?? 0}
              onChange={(e) => onChange('balanceValue', parseFloat(e.target.value))}
              min={0}
              step={0.01}
              className="mt-1"
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── Delay Config ─────────────────────────────────────────────────────────────

function DelayConfigPanel({ config, onChange }: { config: DelayConfig; onChange: (k: string, v: any) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Tipo de Espera</Label>
        <select
          value={config.delayType}
          onChange={(e) => onChange('delayType', e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          {(Object.entries(DELAY_LABELS) as [DelayType, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {config.delayType === 'fixed_time' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs">Duração</Label>
            <Input
              type="number"
              value={config.duration ?? 1}
              onChange={(e) => onChange('duration', parseInt(e.target.value))}
              min={1}
              className="mt-1"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs">Unidade</Label>
            <select
              value={config.unit || 'days'}
              onChange={(e) => onChange('unit', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {(Object.entries(DELAY_UNIT_LABELS) as [DelayUnit, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {config.delayType === 'until_date' && (
        <div>
          <Label className="text-xs">Campo de data do contato</Label>
          <Input
            value={config.dateField || ''}
            onChange={(e) => onChange('dateField', e.target.value)}
            placeholder="Ex: custom_fields.appointment_date"
            className="mt-1"
          />
        </div>
      )}

      {config.delayType === 'until_day_of_week' && (
        <>
          <div>
            <Label className="text-xs">Dia da semana</Label>
            <select
              value={config.dayOfWeek ?? 1}
              onChange={(e) => onChange('dayOfWeek', parseInt(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value={0}>Domingo</option>
              <option value={1}>Segunda</option>
              <option value={2}>Terça</option>
              <option value={3}>Quarta</option>
              <option value={4}>Quinta</option>
              <option value={5}>Sexta</option>
              <option value={6}>Sábado</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Horário</Label>
            <Input
              type="time"
              value={config.time || '09:00'}
              onChange={(e) => onChange('time', e.target.value)}
              className="mt-1"
            />
          </div>
        </>
      )}
    </div>
  )
}
