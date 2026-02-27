/**
 * Segmentation Page — Full RD Station / HubSpot-style segment management.
 *
 * Features:
 * - List of static + dynamic segments with counts
 * - Create / Edit segment dialog
 * - Visual query builder for dynamic segments
 * - Member management for static segments
 * - Evaluate dynamic segments on demand
 */
import { useState, useMemo } from 'react'
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Eye,
  Filter,
  ListFilter,
  Database,
  Zap,
  ChevronDown,
  X,
  UserPlus,
  UserMinus,
  Play,
  Copy,
  MoreVertical,
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
  useSegments,
  useCreateSegment,
  useUpdateSegment,
  useDeleteSegment,
  useEvaluateSegment,
  useSegmentMembers,
  useAddSegmentMembers,
  useRemoveSegmentMembers,
} from '../hooks/use-segments'
import { QueryBuilder, createEmptyRuleGroup } from './query-builder'
import type { Segment, SegmentType, SegmentFormData, SegmentRuleGroup } from '../types'

// ─── Types ───────────────────────────────────────────────────────────────────

type PageView = 'list' | 'create' | 'edit' | 'detail'

// ─── Component ───────────────────────────────────────────────────────────────

export function SegmentationPage() {
  // ── View ──
  const [view, setView] = useState<PageView>('list')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | SegmentType>('all')
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null)

  // ── Form ──
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formType, setFormType] = useState<SegmentType>('dynamic')
  const [formRules, setFormRules] = useState<SegmentRuleGroup>(createEmptyRuleGroup())

  // ── Static member management ──
  const [addEmailsInput, setAddEmailsInput] = useState('')
  const [showAddMembers, setShowAddMembers] = useState(false)

  // ── Delete dialog ──
  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // ── Context menu ──
  const [contextMenu, setContextMenu] = useState<{ segment: Segment; x: number; y: number } | null>(null)

  // ── Queries ──
  const { data: segments, isLoading, error, refetch } = useSegments()
  const evaluateQuery = useEvaluateSegment(selectedSegment?.type === 'dynamic' ? selectedSegment?.id ?? null : null)
  const membersQuery = useSegmentMembers(selectedSegment?.type === 'static' ? selectedSegment?.id ?? null : null)

  const createMutation = useCreateSegment()
  const updateMutation = useUpdateSegment()
  const deleteMutation = useDeleteSegment()
  const addMembersMutation = useAddSegmentMembers()
  const removeMembersMutation = useRemoveSegmentMembers()

  const isSaving = createMutation.isPending || updateMutation.isPending

  // ── Filtered list ──
  const filteredSegments = useMemo(() => {
    if (!segments) return []
    let list = segments
    if (filterType !== 'all') list = list.filter((s) => s.type === filterType)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    }
    return list
  }, [segments, filterType, search])

  // ── Handlers ──

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormType('dynamic')
    setFormRules(createEmptyRuleGroup())
  }

  const handleCreate = () => {
    resetForm()
    setView('create')
  }

  const handleEdit = (seg: Segment) => {
    setFormName(seg.name)
    setFormDescription(seg.description)
    setFormType(seg.type)
    setFormRules(seg.rules ?? createEmptyRuleGroup())
    setSelectedSegment(seg)
    setView('edit')
    setContextMenu(null)
  }

  const handleViewDetail = (seg: Segment) => {
    setSelectedSegment(seg)
    setView('detail')
    setContextMenu(null)
  }

  const handleSave = async () => {
    if (!formName.trim()) return

    const data: SegmentFormData = {
      name: formName,
      description: formDescription,
      type: formType,
      rules: formType === 'dynamic' ? formRules : undefined,
    }

    if (view === 'edit' && selectedSegment) {
      await updateMutation.mutateAsync({ id: selectedSegment.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }

    resetForm()
    setView('list')
  }

  const handleDelete = (seg: Segment) => {
    setDeleteTarget(seg)
    setDeleteDialogOpen(true)
    setContextMenu(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  const handleAddMembers = async () => {
    if (!selectedSegment || !addEmailsInput.trim()) return
    const emails = addEmailsInput
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter(Boolean)
    await addMembersMutation.mutateAsync({ segmentId: selectedSegment.id, emails })
    setAddEmailsInput('')
    setShowAddMembers(false)
  }

  const handleRemoveMember = async (email: string) => {
    if (!selectedSegment) return
    await removeMembersMutation.mutateAsync({ segmentId: selectedSegment.id, emails: [email] })
  }

  // ── Detail view ──
  if (view === 'detail' && selectedSegment) {
    const isStatic = selectedSegment.type === 'static'
    const emails = isStatic
      ? membersQuery.data?.map((m) => m.email) ?? []
      : evaluateQuery.data ?? []
    const isEvaluating = isStatic ? membersQuery.isLoading : evaluateQuery.isLoading

    return (
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setSelectedSegment(null) }} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{selectedSegment.name}</h1>
              <Badge variant={isStatic ? 'default' : 'active'}>
                {isStatic ? 'Estática' : 'Dinâmica'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">{selectedSegment.description || 'Sem descrição'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleEdit(selectedSegment)}>
            <Pencil className="w-4 h-4" />
            Editar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Contatos</p>
            <p className="text-2xl font-bold text-slate-900">
              {isEvaluating ? <Loader2 className="h-5 w-5 animate-spin" /> : emails.length.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Tipo</p>
            <p className="text-lg font-semibold text-slate-900">{isStatic ? 'Lista Estática' : 'Lista Dinâmica'}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">Atualizado</p>
            <p className="text-sm font-medium text-slate-700">
              {new Date(selectedSegment.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Rules preview (dynamic) */}
        {!isStatic && selectedSegment.rules && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Regras de segmentação</h3>
            <QueryBuilder value={selectedSegment.rules} onChange={() => {}} />
          </div>
        )}

        {/* Static: add members */}
        {isStatic && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Membros</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddMembers(!showAddMembers)}>
                <UserPlus className="w-4 h-4" />
                Adicionar
              </Button>
            </div>

            {showAddMembers && (
              <div className="mb-4 p-3 bg-slate-50 rounded-md space-y-2">
                <Label className="text-xs">E-mails (separados por vírgula ou linha)</Label>
                <textarea
                  value={addEmailsInput}
                  onChange={(e) => setAddEmailsInput(e.target.value)}
                  className="w-full h-20 rounded-md border border-slate-200 p-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-botica-500"
                  placeholder="email1@test.com, email2@test.com"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddMembers} disabled={addMembersMutation.isPending}>
                    {addMembersMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Adicionar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowAddMembers(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact list */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Contatos ({isEvaluating ? '...' : emails.length})
            </h3>
            {!isStatic && (
              <Button variant="outline" size="sm" onClick={() => evaluateQuery.refetch()}>
                <Play className="w-3 h-3" />
                Reavaliar
              </Button>
            )}
          </div>

          {isEvaluating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-botica-500" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Nenhum contato encontrado</div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase">E-mail</th>
                    {isStatic && <th className="text-right px-4 py-2 text-xs font-semibold text-slate-400 uppercase w-20">Ação</th>}
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email) => (
                    <tr key={email} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700">{email}</td>
                      {isStatic && (
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleRemoveMember(email)}
                            className="text-slate-400 hover:text-red-500 cursor-pointer"
                            title="Remover"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Create / Edit view ──
  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-5 max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => { resetForm(); setView('list') }} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {view === 'create' ? 'Nova Segmentação' : 'Editar Segmentação'}
            </h1>
            <p className="text-xs text-slate-500">
              {view === 'create' ? 'Crie uma lista para segmentar seus contatos' : `Editando: ${formName}`}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-6 space-y-5">
            {/* Name */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Nome da Segmentação</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Clientes ativos com cashback" className="mt-1" />
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Descrição (opcional)</Label>
              <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Breve descrição da segmentação" className="mt-1" />
            </div>

            {/* Type */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Tipo de Lista</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  onClick={() => setFormType('dynamic')}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-colors cursor-pointer',
                    formType === 'dynamic' ? 'border-botica-500 bg-botica-50' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className={cn('w-4 h-4', formType === 'dynamic' ? 'text-botica-600' : 'text-slate-400')} />
                    <span className={cn('text-sm font-semibold', formType === 'dynamic' ? 'text-botica-700' : 'text-slate-700')}>
                      Lista Dinâmica
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Atualiza automaticamente com base em regras (E/OU). Ideal para segmentação comportamental.
                  </p>
                </button>
                <button
                  onClick={() => setFormType('static')}
                  className={cn(
                    'p-4 rounded-lg border-2 text-left transition-colors cursor-pointer',
                    formType === 'static' ? 'border-botica-500 bg-botica-50' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Database className={cn('w-4 h-4', formType === 'static' ? 'text-botica-600' : 'text-slate-400')} />
                    <span className={cn('text-sm font-semibold', formType === 'static' ? 'text-botica-700' : 'text-slate-700')}>
                      Lista Estática
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Contatos adicionados manualmente ou via importação. Ideal para listas fixas.
                  </p>
                </button>
              </div>
            </div>

            {/* Dynamic: Query Builder */}
            {formType === 'dynamic' && (
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-2 block">Regras de Segmentação</Label>
                <p className="text-[11px] text-slate-500 mb-3">
                  Defina as condições para incluir contatos automaticamente nesta segmentação.
                </p>
                <QueryBuilder value={formRules} onChange={setFormRules} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-lg">
            <Button variant="outline" size="sm" onClick={() => { resetForm(); setView('list') }}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !formName.trim()}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {view === 'create' ? 'Criar Segmentação' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className="space-y-4" onClick={() => contextMenu && setContextMenu(null)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 text-violet-700">
          <ListFilter className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Segmentação</h1>
          <p className="text-xs text-slate-500">Gerencie listas estáticas e dinâmicas de contatos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="w-4 h-4" />
            Nova Segmentação
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar segmentação..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(['all', 'dynamic', 'static'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                filterType === t ? 'bg-botica-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {t === 'all' ? 'Todas' : t === 'dynamic' ? 'Dinâmicas' : 'Estáticas'}
            </button>
          ))}
        </div>
      </div>

      {/* Segment cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-botica-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-6 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Erro ao carregar segmentações</span>
        </div>
      ) : filteredSegments.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center py-16 text-slate-400">
          <ListFilter className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm font-medium text-slate-500">Nenhuma segmentação encontrada</p>
          <Button size="sm" className="mt-4" onClick={handleCreate}>
            <Plus className="w-4 h-4" />
            Criar primeira segmentação
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredSegments.map((seg) => (
            <div
              key={seg.id}
              className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleViewDetail(seg)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {seg.type === 'dynamic' ? (
                    <Zap className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Database className="w-4 h-4 text-blue-500" />
                  )}
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-botica-600 transition-colors">
                    {seg.name}
                  </h3>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setContextMenu({ segment: seg, x: e.clientX, y: e.clientY }) }}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{seg.description || 'Sem descrição'}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">
                    {seg.contactCount.toLocaleString('pt-BR')} contatos
                  </span>
                </div>
                <Badge variant={seg.type === 'dynamic' ? 'active' : 'default'} className="text-[10px]">
                  {seg.type === 'dynamic' ? 'Dinâmica' : 'Estática'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer" onClick={() => handleViewDetail(contextMenu.segment)}>
            <Eye className="w-3.5 h-3.5" /> Ver detalhes
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer" onClick={() => handleEdit(contextMenu.segment)}>
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer" onClick={() => handleDelete(contextMenu.segment)}>
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Excluir Segmentação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir <strong>"{deleteTarget?.name}"</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
