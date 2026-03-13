import { useState, useCallback, useRef, useMemo } from 'react'
import {
  Workflow, Plus, Search, Trash2, Pencil, Play, Pause, Save,
  RefreshCw, AlertCircle, Check, X as XIcon,
  AlertTriangle, Mail, Tag, Clock, GitBranch, Flag,
  Zap, Copy, Eye, Activity, StopCircle, User, ArrowRight,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui/dialog'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/shared/ui/table'
import { cn } from '@/shared/lib/utils'
import {
  useAutomationsList, useDeleteAutomation, useUpdateAutomationStatus,
  useCreateAutomation, useUpdateAutomation, useDuplicateAutomation,
  useListExecutions, useStartExecution, useStopExecution,
} from '../hooks/use-automations'
import { useAutomationEditor } from '../store/automation-editor-store'
import { useTemplatesList } from '@/features/templates/hooks/use-templates'
import { useSenderProfiles, useDefaultConfigurationSet } from '@/features/settings/hooks/use-settings'
import {
  AUTOMATION_STATUSES, TRIGGER_TYPES, NODE_TYPES, WAIT_UNITS,
  CONDITION_FIELDS, CONDITION_OPERATORS, LIFECYCLE_OPTIONS, EXECUTION_STATUSES,
} from '../types'
import type {
  Automation, AutomationStatus, CanvasNode, NodeType,
  WaitParams, ConditionParams, ActionSendEmailParams, ActionTagParams,
  ActionChangeLifecycleParams, TriggerConfig,
} from '../types'

/* ═══════════════════════════════════════════════════════════════════════════
   Automations List View
   ═══════════════════════════════════════════════════════════════════════════ */

function AutomationListView({ onEdit, showToast }: { onEdit: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const { data: automations = [], isLoading, refetch } = useAutomationsList()
  const deleteAutomation = useDeleteAutomation()
  const updateStatus = useUpdateAutomationStatus()
  const duplicateAutomation = useDuplicateAutomation()
  const newAutomation = useAutomationEditor((s) => s.newAutomation)
  const loadAutomation = useAutomationEditor((s) => s.loadAutomation)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialog, setDeleteDialog] = useState<Automation | null>(null)
  const [startExecDialog, setStartExecDialog] = useState<Automation | null>(null)

  const filtered = useMemo(() => {
    let result = automations
    if (statusFilter !== 'all') result = result.filter((a) => a.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((a) => a.name.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q))
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [automations, statusFilter, search])

  const handleNew = () => {
    newAutomation()
    onEdit()
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    try {
      await deleteAutomation.mutateAsync(deleteDialog.id)
      setDeleteDialog(null)
      showToast('Automação excluída')
    } catch { showToast('Erro ao excluir', 'error') }
  }

  const handleToggleStatus = async (a: Automation) => {
    const newStatus: AutomationStatus = a.status === 'active' ? 'paused' : 'active'
    try {
      await updateStatus.mutateAsync({ id: a.id, status: newStatus })
      showToast(newStatus === 'active' ? 'Automação ativada' : 'Automação pausada')
    } catch { showToast('Erro ao atualizar status', 'error') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar automação..." className="pl-8 h-8 text-xs" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-botica-500"
          >
            <option value="all">Todos Status</option>
            {AUTOMATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={handleNew}>
            <Plus className="w-3.5 h-3.5" /> Nova Automação
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-sm text-slate-400">Carregando automações...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Workflow className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Nenhuma automação encontrada</p>
          <p className="text-xs text-slate-400 mt-1">Crie seu primeiro fluxo automatizado de marketing</p>
          <Button size="sm" className="mt-4" onClick={handleNew}><Plus className="w-3.5 h-3.5" /> Criar Automação</Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Automação</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-32">Gatilho</TableHead>
              <TableHead className="w-24 text-center">Rodando</TableHead>
              <TableHead className="w-24 text-right">Total</TableHead>
              <TableHead className="w-32">Criada em</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => {
              const st = AUTOMATION_STATUSES.find((s) => s.value === a.status) ?? AUTOMATION_STATUSES[0]
              const trigger = TRIGGER_TYPES.find((t) => t.value === a.trigger.type)
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <div>
                      <button onClick={() => { loadAutomation(a); onEdit() }} className="font-medium text-sm text-botica-700 hover:underline cursor-pointer">{a.name}</button>
                      {a.description && <p className="text-[11px] text-slate-400 truncate max-w-xs">{a.description}</p>}
                      {a.stateMachineArn && <p className="text-[9px] text-slate-300 font-mono truncate max-w-xs mt-0.5">{a.stateMachineArn}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge className={cn('text-[10px]', st.color)}>{st.label}</Badge>
                      {a.sfnStatus && <span className="text-[9px] text-slate-400">SFN: {a.sfnStatus}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-600">
                      {trigger ? `${trigger.icon} ${trigger.label}` : a.trigger.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {(a.runningExecutions ?? 0) > 0 ? (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                        <Activity className="w-3 h-3 mr-0.5" /> {a.runningExecutions}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-bold text-slate-700">{a.executionCount.toLocaleString('pt-BR')}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {a.stateMachineArn && a.status === 'active' && (
                        <button
                          onClick={() => setStartExecDialog(a)}
                          className="p-1 rounded hover:bg-blue-50 text-blue-500 cursor-pointer"
                          title="Iniciar Execução"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleStatus(a)}
                        className={cn('p-1 rounded hover:bg-slate-100 cursor-pointer', a.status === 'active' ? 'text-amber-500' : 'text-green-500')}
                        title={a.status === 'active' ? 'Pausar' : 'Ativar'}
                      >
                        {a.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => { loadAutomation(a); onEdit() }}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 cursor-pointer"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await duplicateAutomation.mutateAsync(a.id)
                            showToast('Automação duplicada')
                          } catch { showToast('Erro ao duplicar', 'error') }
                        }}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 cursor-pointer"
                        title="Duplicar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteDialog(a)}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent onClose={() => setDeleteDialog(null)}>
          <DialogHeader>
            <DialogTitle>Excluir Automação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteDialog?.name}</strong>? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteAutomation.isPending}>
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Execution dialog */}
      {startExecDialog && (
        <StartExecutionDialog
          automation={startExecDialog}
          onClose={() => setStartExecDialog(null)}
          showToast={showToast}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Node Visual Components
   ═══════════════════════════════════════════════════════════════════════════ */

const NODE_ICONS: Record<NodeType, typeof Mail> = {
  ACTION_SEND_EMAIL: Mail,
  ACTION_ADD_TAG: Tag,
  ACTION_REMOVE_TAG: Tag,
  ACTION_CHANGE_LIFECYCLE: RefreshCw,
  WAIT: Clock,
  CONDITION: GitBranch,
  END: Flag,
}

const NODE_COLORS: Record<NodeType, { bg: string; border: string; text: string; iconBg: string }> = {
  ACTION_SEND_EMAIL: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', iconBg: 'bg-blue-500' },
  ACTION_ADD_TAG: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', iconBg: 'bg-emerald-500' },
  ACTION_REMOVE_TAG: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', iconBg: 'bg-amber-500' },
  ACTION_CHANGE_LIFECYCLE: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', iconBg: 'bg-violet-500' },
  WAIT: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', iconBg: 'bg-orange-500' },
  CONDITION: { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', iconBg: 'bg-rose-500' },
  END: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-600', iconBg: 'bg-slate-500' },
}

function getNodeSummary(node: CanvasNode): string {
  switch (node.type) {
    case 'ACTION_SEND_EMAIL': {
      const p = node.params as ActionSendEmailParams
      return p.templateName || 'Selecionar template...'
    }
    case 'ACTION_ADD_TAG': return `+ ${(node.params as ActionTagParams).tagId || '...'}`
    case 'ACTION_REMOVE_TAG': return `- ${(node.params as ActionTagParams).tagId || '...'}`
    case 'ACTION_CHANGE_LIFECYCLE': return `→ ${(node.params as ActionChangeLifecycleParams).newStage}`
    case 'WAIT': {
      const p = node.params as WaitParams
      const u = WAIT_UNITS.find((w) => w.value === p.unit)?.label ?? p.unit
      return `${p.duration} ${u}`
    }
    case 'CONDITION': {
      const p = node.params as ConditionParams
      const field = CONDITION_FIELDS.find((f) => f.value === p.field)?.label ?? p.field
      const op = CONDITION_OPERATORS.find((o) => o.value === p.operator)?.label ?? p.operator
      return `${field} ${op} ${p.value}`
    }
    case 'END': return 'Fim do fluxo'
  }
}

function CanvasNodeCard({
  node, isSelected, onSelect, onAddAfter, onRemove,
}: {
  node: CanvasNode
  isSelected: boolean
  onSelect: () => void
  onAddAfter: () => void
  onRemove: () => void
}) {
  const config = NODE_TYPES.find((t) => t.value === node.type)
  const colors = NODE_COLORS[node.type]
  const Icon = NODE_ICONS[node.type]

  return (
    <div
      className={cn(
        'relative group rounded-xl border-2 shadow-sm transition-all cursor-pointer select-none',
        colors.bg, colors.border,
        isSelected && 'ring-2 ring-botica-400 ring-offset-2 shadow-lg',
        'hover:shadow-md w-64',
      )}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      <div className="flex items-center gap-3 p-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colors.iconBg)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn('text-xs font-bold', colors.text)}>{config?.label ?? node.type}</div>
          <div className="text-[10px] text-slate-500 truncate">{getNodeSummary(node)}</div>
        </div>
        {node.type !== 'END' && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Condition branches labels */}
      {node.type === 'CONDITION' && (
        <div className="flex justify-between px-3 pb-2 -mt-1">
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">SIM ↓</span>
          <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">NÃO ↓</span>
        </div>
      )}

      {/* Add node button below */}
      {node.type !== 'END' && (
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onAddAfter() }}
            className="w-6 h-6 rounded-full bg-botica-500 text-white flex items-center justify-center shadow-md hover:bg-botica-600 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Connection Lines (SVG)
   ═══════════════════════════════════════════════════════════════════════════ */

function ConnectionLine({ from, to, label }: { from: { x: number; y: number }; to: { x: number; y: number }; label?: string }) {
  const midY = (from.y + to.y) / 2
  const pathD = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`

  return (
    <g>
      <path d={pathD} fill="none" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="6 3" />
      <circle cx={to.x} cy={to.y} r={4} fill="#94a3b8" />
      {label && (
        <text x={(from.x + to.x) / 2} y={midY - 6} textAnchor="middle" className="fill-slate-400 text-[9px] font-bold">{label}</text>
      )}
    </g>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Node Properties Panel (Right sidebar)
   ═══════════════════════════════════════════════════════════════════════════ */

function NodePropertiesPanel({ node, onClose }: { node: CanvasNode; onClose: () => void }) {
  const updateParams = useAutomationEditor((s) => s.updateNodeParams)
  const config = NODE_TYPES.find((t) => t.value === node.type)
  const colors = NODE_COLORS[node.type]
  const Icon = NODE_ICONS[node.type]

  return (
    <div className="w-80 shrink-0 border-l border-slate-200 bg-white overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className={cn('w-6 h-6 rounded flex items-center justify-center', colors.iconBg)}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className={cn('text-xs font-bold', colors.text)}>{config?.label}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400 cursor-pointer">
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {node.type === 'WAIT' && <WaitEditor node={node} onUpdate={updateParams} />}
        {node.type === 'CONDITION' && <ConditionEditor node={node} onUpdate={updateParams} />}
        {node.type === 'ACTION_SEND_EMAIL' && <SendEmailEditor node={node} onUpdate={updateParams} />}
        {(node.type === 'ACTION_ADD_TAG' || node.type === 'ACTION_REMOVE_TAG') && <TagEditor node={node} onUpdate={updateParams} />}
        {node.type === 'ACTION_CHANGE_LIFECYCLE' && <LifecycleEditor node={node} onUpdate={updateParams} />}
        {node.type === 'END' && (
          <p className="text-xs text-slate-400 italic">Este nó encerra a jornada do contato no fluxo.</p>
        )}
      </div>
    </div>
  )
}

function WaitEditor({ node, onUpdate }: { node: CanvasNode; onUpdate: (id: string, p: WaitParams) => void }) {
  const p = node.params as WaitParams
  return (
    <>
      <div>
        <Label className="text-xs">Duração</Label>
        <Input
          type="number" min={1} value={p.duration}
          onChange={(e) => onUpdate(node.id, { ...p, duration: Math.max(1, parseInt(e.target.value) || 1) })}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-xs">Unidade</Label>
        <select
          value={p.unit}
          onChange={(e) => onUpdate(node.id, { ...p, unit: e.target.value as WaitParams['unit'] })}
          className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500"
        >
          {WAIT_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </div>
    </>
  )
}

function ConditionEditor({ node, onUpdate }: { node: CanvasNode; onUpdate: (id: string, p: ConditionParams) => void }) {
  const p = node.params as ConditionParams
  return (
    <>
      <div>
        <Label className="text-xs">Campo</Label>
        <select
          value={p.field}
          onChange={(e) => onUpdate(node.id, { ...p, field: e.target.value })}
          className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500"
        >
          {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      <div>
        <Label className="text-xs">Operador</Label>
        <select
          value={p.operator}
          onChange={(e) => onUpdate(node.id, { ...p, operator: e.target.value as ConditionParams['operator'] })}
          className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500"
        >
          {CONDITION_OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {p.operator !== 'EXISTS' && p.operator !== 'NOT_EXISTS' && (
        <div>
          <Label className="text-xs">Valor</Label>
          <Input value={p.value} onChange={(e) => onUpdate(node.id, { ...p, value: e.target.value })} className="mt-1" placeholder="Ex: tag_cliente" />
        </div>
      )}
    </>
  )
}

function SendEmailEditor({ node, onUpdate }: { node: CanvasNode; onUpdate: (id: string, p: ActionSendEmailParams) => void }) {
  const p = node.params as ActionSendEmailParams
  const { data: templates = [] } = useTemplatesList()
  const { data: senderProfiles = [] } = useSenderProfiles()
  const { data: defaultConfigSet } = useDefaultConfigurationSet()
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const templateData = p.templateData ?? {}

  const addDataEntry = useCallback(() => {
    if (!newKey.trim()) return
    onUpdate(node.id, {
      ...p,
      templateData: { ...templateData, [newKey.trim()]: newValue },
    })
    setNewKey('')
    setNewValue('')
  }, [newKey, newValue, node.id, onUpdate, p, templateData])

  const removeDataEntry = useCallback((key: string) => {
    const next = { ...templateData }
    delete next[key]
    onUpdate(node.id, { ...p, templateData: next })
  }, [node.id, onUpdate, p, templateData])

  return (
    <>
      {/* Template selector */}
      <div>
        <Label className="text-xs">Template de E-mail</Label>
        <select
          value={p.templateName}
          onChange={(e) => onUpdate(node.id, { ...p, templateName: e.target.value })}
          className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500"
        >
          <option value="">Selecionar template...</option>
          {templates.map((t) => <option key={t.name} value={t.name}>{t.displayName || t.name}</option>)}
        </select>
      </div>
      {/* From address selector */}
      <div>
        <Label className="text-xs">Remetente</Label>
        <select
          value={p.fromAddress}
          onChange={(e) => onUpdate(node.id, { ...p, fromAddress: e.target.value })}
          className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500"
        >
          <option value="">Selecionar remetente...</option>
          {senderProfiles.map((s) => <option key={s.id} value={s.email}>{s.name} ({s.email})</option>)}
        </select>
      </div>
      {/* Configuration Set */}
      <div>
        <Label className="text-xs">Configuration Set</Label>
        <Input
          value={p.configurationSet ?? defaultConfigSet ?? 'default'}
          onChange={(e) => onUpdate(node.id, { ...p, configurationSet: e.target.value })}
          className="mt-1" placeholder="default"
        />
      </div>
      {/* Template Data — key/value pairs */}
      <div>
        <Label className="text-xs">Dados do Template (substituição)</Label>
        <p className="text-xs text-slate-400 mt-0.5 mb-2">
          Use <code className="bg-slate-100 px-1 rounded">$.campo</code> para dados dinâmicos do contato (ex: $.fullName, $.email)
        </p>
        {Object.entries(templateData).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1 mb-1">
            <Input value={key} readOnly className="flex-1 text-xs bg-slate-50" />
            <Input
              value={val}
              onChange={(e) => onUpdate(node.id, { ...p, templateData: { ...templateData, [key]: e.target.value } })}
              className="flex-1 text-xs"
            />
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => removeDataEntry(key)}>
              <XIcon className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-1 mt-1">
          <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} className="flex-1 text-xs" placeholder="chave (ex: nome)" />
          <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} className="flex-1 text-xs" placeholder="valor (ex: $.fullName)" />
          <Button variant="ghost" size="sm" className="h-7 px-2 text-botica-600" onClick={addDataEntry}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </>
  )
}

function TagEditor({ node, onUpdate }: { node: CanvasNode; onUpdate: (id: string, p: ActionTagParams) => void }) {
  const p = node.params as ActionTagParams
  return (
    <div>
      <Label className="text-xs">{node.type === 'ACTION_ADD_TAG' ? 'Tag para adicionar' : 'Tag para remover'}</Label>
      <Input value={p.tagId} onChange={(e) => onUpdate(node.id, { ...p, tagId: e.target.value })} className="mt-1" placeholder="nome-da-tag" />
    </div>
  )
}

function LifecycleEditor({ node, onUpdate }: { node: CanvasNode; onUpdate: (id: string, p: ActionChangeLifecycleParams) => void }) {
  const p = node.params as ActionChangeLifecycleParams
  return (
    <div>
      <Label className="text-xs">Novo Estágio</Label>
      <select
        value={p.newStage}
        onChange={(e) => onUpdate(node.id, { ...p, newStage: e.target.value as ActionChangeLifecycleParams['newStage'] })}
        className="w-full mt-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-botica-500"
      >
        {LIFECYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Add Node Palette (inline dropdown)
   ═══════════════════════════════════════════════════════════════════════════ */

function AddNodePalette({ onAdd, onClose }: { onAdd: (type: NodeType) => void; onClose: () => void }) {
  const categories = [
    { label: 'Ações', items: NODE_TYPES.filter((n) => n.category === 'action') },
    { label: 'Fluxo', items: NODE_TYPES.filter((n) => n.category === 'flow') },
    { label: 'Final', items: NODE_TYPES.filter((n) => n.category === 'end') },
  ]

  return (
    <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl p-3 w-72">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-700">Adicionar Nó</span>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-slate-100 text-slate-400 cursor-pointer"><XIcon className="w-3.5 h-3.5" /></button>
      </div>
      {categories.map((cat) => (
        <div key={cat.label} className="mb-2">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{cat.label}</div>
          <div className="space-y-1">
            {cat.items.map((item) => (
              <button
                key={item.value}
                onClick={() => { onAdd(item.value); onClose() }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span className={cn('w-6 h-6 rounded flex items-center justify-center text-white text-[10px]', item.color)}>{item.icon}</span>
                <div>
                  <div className="font-medium text-slate-700">{item.label}</div>
                  <div className="text-[10px] text-slate-400">{item.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Canvas (Flow Editor)
   ═══════════════════════════════════════════════════════════════════════════ */

function AutomationCanvas({ onBack, showToast }: { onBack: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const {
    automation, selectedNodeId, isDirty, validationErrors,
    setName, setTrigger, addNode, removeNode,
    selectNode, validate, exportPayload, loadAutomation,
    getASLPreview,
  } = useAutomationEditor()

  const createMutation = useCreateAutomation()
  const updateMutation = useUpdateAutomation()
  const [addingAfterNodeId, setAddingAfterNodeId] = useState<string | null>(null)
  const [showTriggerConfig, setShowTriggerConfig] = useState(false)
  const [showJsonPreview, setShowJsonPreview] = useState(false)
  const [jsonPayloadCache, setJsonPayloadCache] = useState<string>('')
  const canvasRef = useRef<HTMLDivElement>(null)

  const isSaving = createMutation.isPending || updateMutation.isPending

  const selectedNode = automation?.nodes.find((n) => n.id === selectedNodeId) ?? null

  // Build connection lines
  const connections = useMemo(() => {
    if (!automation) return []
    const lines: { from: CanvasNode; to: CanvasNode; label?: string }[] = []
    for (const node of automation.nodes) {
      if (node.next) {
        const target = automation.nodes.find((n) => n.id === node.next)
        if (target) lines.push({ from: node, to: target })
      }
      if (node.branches) {
        if (node.branches.truePath) {
          const target = automation.nodes.find((n) => n.id === node.branches!.truePath)
          if (target) lines.push({ from: node, to: target, label: 'SIM' })
        }
        if (node.branches.falsePath) {
          const target = automation.nodes.find((n) => n.id === node.branches!.falsePath)
          if (target) lines.push({ from: node, to: target, label: 'NÃO' })
        }
      }
    }
    return lines
  }, [automation])

  const handleSave = useCallback(async () => {
    const errors = validate()
    if (errors.length > 0) {
      showToast(`${errors.length} erro(s) de validação`, 'error')
      return
    }
    const payload = exportPayload()
    if (!payload) return
    try {
      if (payload.isNew && payload.createInput) {
        const created = await createMutation.mutateAsync(payload.createInput)
        loadAutomation(created)
        showToast('Automação criada com sucesso!')
      } else if (!payload.isNew && payload.updateInput && automation) {
        const updated = await updateMutation.mutateAsync({ id: automation.id, input: payload.updateInput })
        loadAutomation(updated)
        showToast('Automação salva com sucesso!')
      }
    } catch {
      showToast('Erro ao salvar', 'error')
    }
  }, [validate, exportPayload, automation, createMutation, updateMutation, loadAutomation, showToast])

  const handleExportJson = useCallback(() => {
    const asl = getASLPreview()
    if (!asl) {
      showToast('Não foi possível gerar o ASL — verifique o fluxo', 'error')
      return
    }
    setJsonPayloadCache(JSON.stringify(asl, null, 2))
    setShowJsonPreview(true)
  }, [getASLPreview, showToast])

  if (!automation) return null

  // Calculate SVG viewport
  const allX = automation.nodes.map((n) => n.position.x)
  const allY = automation.nodes.map((n) => n.position.y)
  const svgWidth = Math.max(800, ...allX.map((x) => x + 400))
  const svgHeight = Math.max(600, ...allY.map((y) => y + 200))

  return (
    <div className="flex flex-col h-full">
      {/* Canvas Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <XIcon className="w-3.5 h-3.5" /> Voltar
          </Button>
          <div className="h-5 w-px bg-slate-200" />
          <Input
            value={automation.name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-64 text-sm font-semibold border-transparent hover:border-slate-200 focus:border-botica-500"
          />
          {isDirty && <span className="text-[10px] text-amber-600 font-medium">• Alterações não salvas</span>}
        </div>
        <div className="flex items-center gap-2">
          {validationErrors.length > 0 && (
            <span className="text-[10px] text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {validationErrors.length} erro(s)
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => validate()}>
            <Check className="w-3.5 h-3.5" /> Validar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJson}>
            <Eye className="w-3.5 h-3.5" /> ASL
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Main content: Sidebar + Canvas + Properties */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Trigger + Node palette */}
        <div className="w-60 shrink-0 border-r border-slate-200 bg-slate-50/50 overflow-y-auto">
          <div className="p-3 space-y-4">
            {/* Trigger section */}
            <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gatilho de Entrada</h3>
              <button
                onClick={() => setShowTriggerConfig(!showTriggerConfig)}
                className="w-full rounded-lg border-2 border-dashed border-violet-300 bg-violet-50 p-3 text-left hover:border-violet-400 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-600" />
                  <div>
                    <div className="text-xs font-bold text-violet-700">
                      {TRIGGER_TYPES.find((t) => t.value === automation.trigger.type)?.label ?? 'Selecionar...'}
                    </div>
                    {automation.trigger.params.tagId && (
                      <div className="text-[10px] text-violet-500 mt-0.5">Tag: {automation.trigger.params.tagId}</div>
                    )}
                  </div>
                </div>
              </button>

              {showTriggerConfig && (
                <div className="mt-2 p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                  <Label className="text-xs">Tipo de Gatilho</Label>
                  <select
                    value={automation.trigger.type}
                    onChange={(e) => setTrigger({ ...automation.trigger, type: e.target.value as TriggerConfig['type'] })}
                    className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-botica-500"
                  >
                    {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                  {(automation.trigger.type === 'TAG_ADDED' || automation.trigger.type === 'TAG_REMOVED') && (
                    <div>
                      <Label className="text-xs">Tag</Label>
                      <Input
                        value={automation.trigger.params.tagId ?? ''}
                        onChange={(e) => setTrigger({ ...automation.trigger, params: { ...automation.trigger.params, tagId: e.target.value } })}
                        className="mt-1 h-8 text-xs" placeholder="nome-da-tag"
                      />
                    </div>
                  )}
                  {automation.trigger.type === 'ENTERED_LIST' && (
                    <div>
                      <Label className="text-xs">Segmento</Label>
                      <Input
                        value={automation.trigger.params.segmentId ?? ''}
                        onChange={(e) => setTrigger({ ...automation.trigger, params: { ...automation.trigger.params, segmentId: e.target.value } })}
                        className="mt-1 h-8 text-xs" placeholder="ID do segmento"
                      />
                    </div>
                  )}
                  {automation.trigger.type === 'EVENT_OCCURRED' && (
                    <div>
                      <Label className="text-xs">Tipo de Evento</Label>
                      <Input
                        value={automation.trigger.params.eventType ?? ''}
                        onChange={(e) => setTrigger({ ...automation.trigger, params: { ...automation.trigger.params, eventType: e.target.value } })}
                        className="mt-1 h-8 text-xs" placeholder="cart_abandoned"
                      />
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Node palette */}
            <section>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Componentes</h3>
              <div className="space-y-1">
                {NODE_TYPES.map((nt) => (
                  <button
                    key={nt.value}
                    onClick={() => addNode(nt.value)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                  >
                    <span className={cn('w-6 h-6 rounded flex items-center justify-center text-white text-[10px]', nt.color)}>{nt.icon}</span>
                    <span className="text-slate-600 font-medium">{nt.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">Erros de Validação</h3>
                <div className="space-y-1">
                  {validationErrors.map((err, i) => (
                    <div
                      key={i}
                      onClick={() => err.nodeId && selectNode(err.nodeId)}
                      className={cn('text-[10px] text-red-600 bg-red-50 rounded p-2 border border-red-100', err.nodeId && 'cursor-pointer hover:bg-red-100')}
                    >
                      {err.message}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-auto bg-[radial-gradient(circle,#e2e8f0_1px,transparent_1px)] bg-[length:20px_20px] relative" ref={canvasRef} onClick={() => selectNode(null)}>
          <svg className="absolute inset-0 pointer-events-none" width={svgWidth} height={svgHeight}>
            {connections.map((conn, i) => (
              <ConnectionLine
                key={i}
                from={{ x: conn.from.position.x + 128, y: conn.from.position.y + 60 }}
                to={{ x: conn.to.position.x + 128, y: conn.to.position.y }}
                label={conn.label}
              />
            ))}
          </svg>
          <div className="relative" style={{ minWidth: svgWidth, minHeight: svgHeight }}>
            {automation.nodes.map((node) => (
              <div
                key={node.id}
                className="absolute"
                style={{ left: node.position.x, top: node.position.y }}
              >
                <CanvasNodeCard
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={() => selectNode(node.id)}
                  onAddAfter={() => setAddingAfterNodeId(addingAfterNodeId === node.id ? null : node.id)}
                  onRemove={() => removeNode(node.id)}
                />
                {addingAfterNodeId === node.id && (
                  <AddNodePalette
                    onAdd={(type) => { addNode(type, node.id); setAddingAfterNodeId(null) }}
                    onClose={() => setAddingAfterNodeId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Properties panel */}
        {selectedNode && (
          <NodePropertiesPanel node={selectedNode} onClose={() => selectNode(null)} />
        )}
      </div>

      {/* JSON Preview Dialog */}
      <Dialog open={showJsonPreview} onOpenChange={setShowJsonPreview}>
        <DialogContent onClose={() => setShowJsonPreview(false)} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Amazon States Language (ASL)</DialogTitle>
            <DialogDescription>Definição da máquina de estado que será criada no AWS Step Functions.</DialogDescription>
          </DialogHeader>
          <pre className="bg-slate-900 text-green-400 rounded-lg p-4 text-xs max-h-[60vh] overflow-auto font-mono">
            {jsonPayloadCache}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJsonPreview(false)}>Fechar</Button>
            <Button onClick={() => {
              if (jsonPayloadCache) {
                navigator.clipboard.writeText(jsonPayloadCache)
                showToast('JSON copiado para a área de transferência!')
              }
            }}>
              <Copy className="w-3.5 h-3.5" /> Copiar JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Start Execution Dialog
   ═══════════════════════════════════════════════════════════════════════════ */

function StartExecutionDialog({ automation, onClose, showToast }: { automation: Automation; onClose: () => void; showToast: (m: string, t?: 'success' | 'error') => void }) {
  const startExec = useStartExecution()
  const [contactId, setContactId] = useState('')
  const [email, setEmail] = useState('')

  const handleStart = async () => {
    if (!contactId.trim()) {
      showToast('Informe o ID do contato', 'error')
      return
    }
    try {
      const extra = email.trim() ? JSON.stringify({ email: email.trim() }) : undefined
      await startExec.mutateAsync({ automationId: automation.id, contactId: contactId.trim(), input: extra })
      showToast('Execução iniciada com sucesso!')
      onClose()
    } catch { showToast('Erro ao iniciar execução', 'error') }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Iniciar Execução</DialogTitle>
          <DialogDescription>
            Adicione um contato à automação <strong>{automation.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">ID do Contato *</Label>
            <Input value={contactId} onChange={(e) => setContactId(e.target.value)} className="mt-1" placeholder="UUID do contato" />
          </div>
          <div>
            <Label className="text-xs">E-mail (opcional)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="email@exemplo.com" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleStart} disabled={startExec.isPending}>
            {startExec.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Iniciar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Executions Dashboard
   ═══════════════════════════════════════════════════════════════════════════ */

function ExecutionsDashboard({ showToast }: { showToast: (m: string, t?: 'success' | 'error') => void }) {
  const { data: automations = [], isLoading: loadingAutomations } = useAutomationsList()
  const [selectedAutomation, setSelectedAutomation] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('RUNNING')
  const stopExec = useStopExecution()

  // Get automations that have state machines
  const activeAutomations = useMemo(() =>
    automations.filter((a) => a.stateMachineArn),
  [automations])

  // Collect executions for the selected automation
  const automationId = selectedAutomation === 'all' ? (activeAutomations[0]?.id ?? null) : selectedAutomation
  const { data: executions = [], isLoading: loadingExecs, refetch } = useListExecutions(
    automationId,
    statusFilter !== 'all' ? statusFilter as import('../types').ExecutionStatus : undefined,
  )

  // Stats from the list
  const runningCount = automations.reduce((sum, a) => sum + (a.runningExecutions ?? 0), 0)
  const totalExecs = automations.reduce((sum, a) => sum + a.executionCount, 0)

  const handleStop = async (arn: string) => {
    try {
      await stopExec.mutateAsync(arn)
      showToast('Execução interrompida')
      refetch()
    } catch { showToast('Erro ao parar execução', 'error') }
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="text-[10px] text-blue-600 font-bold uppercase">Em Execução</div>
          <div className="text-xl font-bold text-blue-700 mt-0.5">{runningCount}</div>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
          <div className="text-[10px] text-violet-600 font-bold uppercase">Automações Ativas</div>
          <div className="text-xl font-bold text-violet-700 mt-0.5">{activeAutomations.length}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-[10px] text-emerald-600 font-bold uppercase">Total de Execuções</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{totalExecs.toLocaleString('pt-BR')}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-[10px] text-slate-500 font-bold uppercase">State Machines</div>
          <div className="text-xl font-bold text-slate-700 mt-0.5">{activeAutomations.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={selectedAutomation}
          onChange={(e) => setSelectedAutomation(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-botica-500"
        >
          {activeAutomations.length > 0 ? (
            activeAutomations.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))
          ) : (
            <option value="all">Nenhuma automação com state machine</option>
          )}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-botica-500"
        >
          <option value="all">Todos Status</option>
          {EXECUTION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={loadingExecs}>
          <RefreshCw className={cn('w-3.5 h-3.5', loadingExecs && 'animate-spin')} />
        </Button>
      </div>

      {/* Executions table */}
      {loadingAutomations || loadingExecs ? (
        <div className="text-center py-8 text-sm text-slate-400">Carregando execuções...</div>
      ) : executions.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Nenhuma execução encontrada</p>
          <p className="text-xs text-slate-400 mt-1">
            {activeAutomations.length === 0
              ? 'Nenhuma automação possui uma state machine criada'
              : 'Inicie uma execução para ver os detalhes aqui'}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Automação</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-36">Execution Name</TableHead>
              <TableHead className="w-40">Iniciada em</TableHead>
              <TableHead className="w-40">Encerrada em</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.map((exec) => {
              const st = EXECUTION_STATUSES.find((s) => s.value === exec.status)
              return (
                <TableRow key={exec.executionArn}>
                  <TableCell>
                    <div>
                      <div className="text-xs font-medium text-slate-700">{exec.automationName ?? '—'}</div>
                      {exec.contactId && <div className="text-[10px] text-slate-400"><User className="w-3 h-3 inline mr-0.5" />{exec.contactId}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px]', st?.color ?? 'bg-slate-100 text-slate-600')}>{st?.label ?? exec.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] text-slate-500 font-mono truncate block max-w-[120px]">{exec.name ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">{exec.startDate ? new Date(exec.startDate).toLocaleString('pt-BR') : '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-500">{exec.stopDate ? new Date(exec.stopDate).toLocaleString('pt-BR') : '—'}</span>
                  </TableCell>
                  <TableCell>
                    {exec.status === 'RUNNING' && (
                      <button
                        onClick={() => handleStop(exec.executionArn)}
                        className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 cursor-pointer"
                        title="Parar Execução"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Automations Page
   ═══════════════════════════════════════════════════════════════════════════ */

export function AutomationsPage() {
  const [view, setView] = useState<'list' | 'canvas'>('list')
  const [tab, setTab] = useState<'automations' | 'executions'>('automations')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleEditView = useCallback(() => setView('canvas'), [])

  return (
    <div className={cn('flex flex-col', view === 'canvas' ? 'h-[calc(100vh-4rem-2.25rem)] -m-4 lg:-m-6' : 'space-y-4')}>
      {view === 'list' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 text-violet-700">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Automações</h1>
                <p className="text-xs text-slate-500">Fluxos automatizados de marketing · AWS Step Functions</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            <button
              onClick={() => setTab('automations')}
              className={cn(
                'px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer',
                tab === 'automations'
                  ? 'border-botica-500 text-botica-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              <Workflow className="w-3.5 h-3.5 inline mr-1.5" />Automações
            </button>
            <button
              onClick={() => setTab('executions')}
              className={cn(
                'px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer',
                tab === 'executions'
                  ? 'border-botica-500 text-botica-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              <Activity className="w-3.5 h-3.5 inline mr-1.5" />Execuções em Andamento
            </button>
          </div>

          {/* Tab content */}
          {tab === 'automations' && (
            <AutomationListView
              onEdit={handleEditView}
              showToast={showToast}
            />
          )}
          {tab === 'executions' && (
            <ExecutionsDashboard showToast={showToast} />
          )}
        </>
      )}

      {view === 'canvas' && (
        <AutomationCanvas
          onBack={() => setView('list')}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-4 right-4 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4',
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-botica-600 text-white',
        )}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
