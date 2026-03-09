import { useState, useCallback, useRef } from 'react'
import {
  ListFilter, Plus, Pencil, Trash2, X, Check, AlertCircle,
  RefreshCw, Users, ChevronDown, ChevronUp, Copy, Search, Eye,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui/dialog'
import { cn, formatPhone } from '@/shared/lib/utils'
import {
  useSegmentsList,
  useCreateSegment,
  useUpdateSegment,
  useDeleteSegment,
  usePreviewSegmentContacts,
} from '../hooks/use-segments'
import { SEGMENT_FIELDS } from '../types'
import type { Segment, SegmentCondition, CreateSegmentInput, UpdateSegmentInput } from '../types'

// ── Condition Row ────────────────────────────────────────────────────────────

function ConditionRow({
  condition,
  index,
  onChange,
  onRemove,
}: {
  condition: SegmentCondition
  index: number
  onChange: (index: number, condition: SegmentCondition) => void
  onRemove: (index: number) => void
}) {
  const fieldDef = SEGMENT_FIELDS.find((f) => f.field === condition.field)
  const operators = fieldDef?.operators ?? []

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-2.5">
      <span className="text-[10px] text-slate-400 font-mono w-5 shrink-0">#{index + 1}</span>

      {/* Field select */}
      <select
        value={condition.field}
        onChange={(e) => {
          const newField = SEGMENT_FIELDS.find((f) => f.field === e.target.value)
          onChange(index, {
            field: e.target.value,
            operator: newField?.operators[0]?.value ?? 'equals',
            value: '',
          })
        }}
        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-botica-500"
      >
        {SEGMENT_FIELDS.map((f) => (
          <option key={f.field} value={f.field}>{f.label}</option>
        ))}
      </select>

      {/* Operator select */}
      <select
        value={condition.operator}
        onChange={(e) => onChange(index, { ...condition, operator: e.target.value })}
        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-botica-500"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value input */}
      {fieldDef?.valueType === 'select' ? (
        <select
          value={condition.value}
          onChange={(e) => onChange(index, { ...condition, value: e.target.value })}
          className="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-botica-500"
        >
          <option value="">Selecione...</option>
          {fieldDef.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : fieldDef?.valueType === 'date' ? (
        <Input
          type="date"
          value={condition.value}
          onChange={(e) => onChange(index, { ...condition, value: e.target.value })}
          className="h-8 flex-1 text-xs"
        />
      ) : (
        <Input
          value={condition.value}
          onChange={(e) => onChange(index, { ...condition, value: e.target.value })}
          placeholder={fieldDef?.field === 'tags' ? 'Ex: Pets' : 'Valor...'}
          className="h-8 flex-1 text-xs"
        />
      )}

      <button
        onClick={() => onRemove(index)}
        className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Segment Form Dialog ──────────────────────────────────────────────────────

function SegmentFormDialog({
  open,
  onOpenChange,
  segment,
  onSave,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  segment: Segment | null
  onSave: (data: CreateSegmentInput | { id: string; input: UpdateSegmentInput }) => Promise<void>
  isPending: boolean
}) {
  const isEdit = !!segment

  const [name, setName] = useState(segment?.name ?? '')
  const [description, setDescription] = useState(segment?.description ?? '')
  const [conditionLogic, setConditionLogic] = useState(segment?.conditionLogic ?? 'AND')
  const [conditions, setConditions] = useState<SegmentCondition[]>(
    segment?.conditions ?? [{ field: 'lifecycleStage', operator: 'equals', value: '' }],
  )

  // Reset form when dialog opens
  useState(() => {
    if (open) {
      setName(segment?.name ?? '')
      setDescription(segment?.description ?? '')
      setConditionLogic(segment?.conditionLogic ?? 'AND')
      setConditions(segment?.conditions ?? [{ field: 'lifecycleStage', operator: 'equals', value: '' }])
    }
  })

  const handleAddCondition = () => {
    setConditions([...conditions, { field: 'lifecycleStage', operator: 'equals', value: '' }])
  }

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const handleChangeCondition = (index: number, cond: SegmentCondition) => {
    setConditions(conditions.map((c, i) => (i === index ? cond : c)))
  }

  const handleSubmit = async () => {
    const validConditions = conditions.filter((c) => c.value.trim())
    if (isEdit && segment) {
      await onSave({
        id: segment.id,
        input: {
          name: name.trim(),
          description: description.trim() || null,
          conditionLogic,
          conditions: validConditions,
        },
      })
    } else {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        conditionLogic,
        conditions: validConditions,
      } satisfies CreateSegmentInput)
    }
  }

  const canSubmit = name.trim() && conditions.some((c) => c.value.trim()) && !isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Segmento' : 'Novo Segmento'}</DialogTitle>
          <DialogDescription>
            Defina as condições para agrupar contatos. {conditionLogic === 'AND'
              ? 'O contato deve satisfazer TODAS as condições (interseção).'
              : 'O contato deve satisfazer PELO MENOS UMA condição (união, com deduplicação automática).'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium text-slate-700">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Leads com tag Pets"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opcional..."
                className="mt-1"
              />
            </div>
          </div>

          {/* Logic toggle */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">Lógica de Combinação</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConditionLogic('AND')}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all cursor-pointer',
                  conditionLogic === 'AND'
                    ? 'border-botica-500 bg-botica-50 text-botica-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                )}
              >
                <span className="block text-sm">E (AND)</span>
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                  Contato deve satisfazer TODAS as condições
                </span>
              </button>
              <button
                type="button"
                onClick={() => setConditionLogic('OR')}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all cursor-pointer',
                  conditionLogic === 'OR'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                )}
              >
                <span className="block text-sm">OU (OR)</span>
                <span className="block text-[10px] font-normal opacity-70 mt-0.5">
                  Contato deve satisfazer PELO MENOS UMA (deduplica automaticamente)
                </span>
              </button>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">Condições</Label>
            <div className="space-y-2">
              {conditions.map((cond, i) => (
                <div key={i}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 py-1 px-6">
                      <div className="flex-1 h-px bg-slate-200" />
                      <Badge className={cn(
                        'text-[10px]',
                        conditionLogic === 'AND' ? 'bg-botica-100 text-botica-700' : 'bg-indigo-100 text-indigo-700',
                      )}>
                        {conditionLogic}
                      </Badge>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                  )}
                  <ConditionRow
                    condition={cond}
                    index={i}
                    onChange={handleChangeCondition}
                    onRemove={handleRemoveCondition}
                  />
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="mt-2" onClick={handleAddCondition}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar condição
            </Button>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <strong>Deduplicação automática:</strong> Quando a lógica é OU (OR), contatos que satisfazem múltiplas
              condições são contabilizados apenas uma vez. Por exemplo, um contato com tags "Pets" e "Mulheres"
              aparecerá uma única vez no segmento, evitando envios duplicados.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Segmento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Segment Contact Preview ──────────────────────────────────────────────────

function SegmentPreview({ segment }: { segment: Segment }) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  const { data, isLoading, isError } = usePreviewSegmentContacts(
    segment.conditions,
    segment.conditionLogic,
    debouncedSearch,
    true,
  )

  const contacts = data?.items ?? []
  const totalCount = data?.totalCount ?? null

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          Preview de Contatos
          {totalCount != null && (
            <Badge className="text-[10px] bg-botica-100 text-botica-700 ml-1">
              {totalCount.toLocaleString('pt-BR')} contato{totalCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </h4>
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar contato..."
            className="pl-7 h-7 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <RefreshCw className="w-4 h-4 animate-spin text-slate-400 mr-2" />
          <span className="text-xs text-slate-400">Carregando contatos...</span>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 py-4 justify-center text-xs text-red-500">
          <AlertCircle className="w-3.5 h-3.5" />
          Erro ao carregar preview
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-4">
          <Users className="w-6 h-6 text-slate-300 mx-auto mb-1" />
          <p className="text-xs text-slate-400">
            {search ? 'Nenhum contato encontrado para esta busca' : 'Nenhum contato corresponde a este segmento'}
          </p>
        </div>
      ) : (
        <div className="max-h-52 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium text-slate-500">Nome</th>
                <th className="px-3 py-1.5 text-left font-medium text-slate-500">E-mail</th>
                <th className="px-3 py-1.5 text-left font-medium text-slate-500">Telefone</th>
                <th className="px-3 py-1.5 text-left font-medium text-slate-500">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-1.5 text-slate-700 font-medium truncate max-w-[150px]">{c.fullName}</td>
                  <td className="px-3 py-1.5 text-slate-600 truncate max-w-[180px]">{c.email}</td>
                  <td className="px-3 py-1.5 text-slate-500">{formatPhone(c.phone)}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1 flex-wrap">
                      {c.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} className="text-[9px] bg-slate-100 text-slate-600">{tag}</Badge>
                      ))}
                      {(c.tags?.length ?? 0) > 3 && (
                        <span className="text-[9px] text-slate-400">+{(c.tags?.length ?? 0) - 3}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Segment Card ─────────────────────────────────────────────────────────────

function SegmentCard({
  segment,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  segment: Segment
  onEdit: (s: Segment) => void
  onDelete: (s: Segment) => void
  onDuplicate: (s: Segment) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 p-4">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
          <ListFilter className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800 truncate">{segment.name}</h3>
            <Badge className={cn(
              'text-[10px]',
              segment.conditionLogic === 'AND' ? 'bg-botica-100 text-botica-700' : 'bg-indigo-100 text-indigo-700',
            )}>
              {segment.conditionLogic}
            </Badge>
          </div>
          {segment.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{segment.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
            <span>
              <Users className="w-3 h-3 inline mr-0.5" />
              {segment.conditions.length} condição{segment.conditions.length !== 1 ? 'ões' : ''}
            </span>
            {segment.contactCount != null && (
              <span className="text-slate-600 font-medium">
                ~{segment.contactCount.toLocaleString('pt-BR')} contatos
              </span>
            )}
            <span>
              Criado em {new Date(segment.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              'p-1.5 rounded-md cursor-pointer transition-colors',
              showPreview
                ? 'bg-botica-100 text-botica-700'
                : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600',
            )}
            title="Preview de contatos"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            title="Ver condições"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDuplicate(segment)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            title="Duplicar"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(segment)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(segment)}
            className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded conditions */}
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-slate-100">
          <div className="mt-3 space-y-1.5">
            {segment.conditions.map((cond, i) => {
              const fieldDef = SEGMENT_FIELDS.find((f) => f.field === cond.field)
              const opDef = fieldDef?.operators.find((o) => o.value === cond.operator)
              const valueLabelMap = fieldDef?.options?.find((o) => o.value === cond.value)

              return (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  {i > 0 && (
                    <Badge className={cn(
                      'text-[9px] mr-1',
                      segment.conditionLogic === 'AND' ? 'bg-botica-100 text-botica-700' : 'bg-indigo-100 text-indigo-700',
                    )}>
                      {segment.conditionLogic}
                    </Badge>
                  )}
                  <span className="font-medium text-slate-700">{fieldDef?.label ?? cond.field}</span>
                  <span className="text-slate-400">{opDef?.label ?? cond.operator}</span>
                  <Badge className="text-[10px] bg-slate-100 text-slate-700">{valueLabelMap?.label ?? cond.value}</Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contact preview */}
      {showPreview && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100">
          <SegmentPreview segment={segment} />
        </div>
      )}
    </div>
  )
}

// ── Main: Segmentation View ──────────────────────────────────────────────────

export function SegmentationView() {
  const { data: segments, isLoading } = useSegmentsList()
  const createSeg = useCreateSegment()
  const updateSeg = useUpdateSegment()
  const deleteSeg = useDeleteSegment()

  const [formOpen, setFormOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Segment | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const handleNew = useCallback(() => {
    setEditingSegment(null)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((segment: Segment) => {
    setEditingSegment(segment)
    setFormOpen(true)
  }, [])

  const handleDuplicate = useCallback(async (segment: Segment) => {
    try {
      await createSeg.mutateAsync({
        name: `${segment.name} (cópia)`,
        description: segment.description,
        conditionLogic: segment.conditionLogic,
        conditions: segment.conditions,
      })
      showToast('Segmento duplicado!')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao duplicar', 'error')
    }
  }, [createSeg, showToast])

  const handleSave = useCallback(async (data: CreateSegmentInput | { id: string; input: UpdateSegmentInput }) => {
    try {
      if ('id' in data) {
        await updateSeg.mutateAsync(data)
        showToast('Segmento atualizado!')
      } else {
        await createSeg.mutateAsync(data)
        showToast('Segmento criado!')
      }
      setFormOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar segmento', 'error')
    }
  }, [createSeg, updateSeg, showToast])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteSeg.mutateAsync(deleteTarget.id)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      showToast('Segmento excluído')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir', 'error')
    }
  }, [deleteTarget, deleteSeg, showToast])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700">
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Segmentação</h1>
            <p className="text-xs text-slate-500">
              Crie segmentos inteligentes para direcionar campanhas. Deduplicação automática garante que cada contato
              receba no máximo um envio por campanha.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleNew}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Novo Segmento
        </Button>
      </div>

      {/* Segment list */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <RefreshCw className="w-5 h-5 animate-spin text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Carregando segmentos...</p>
        </div>
      ) : !segments?.length ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-12 text-center">
          <ListFilter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-1">Nenhum segmento criado</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Crie segmentos baseados em lifecycle stage, tags, status de e-mail, origem
            e outros atributos para enviar campanhas direcionadas com maior taxa de conversão.
          </p>
          <Button size="sm" onClick={handleNew}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Criar primeiro segmento
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {segments.map((seg) => (
            <SegmentCard
              key={seg.id}
              segment={seg}
              onEdit={handleEdit}
              onDelete={(s) => { setDeleteTarget(s); setDeleteDialogOpen(true) }}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <SegmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        segment={editingSegment}
        onSave={handleSave}
        isPending={createSeg.isPending || updateSeg.isPending}
      />

      {/* Delete Confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Excluir Segmento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o segmento <strong>{deleteTarget?.name}</strong>?
              Campanhas que referenciam este segmento não serão afetadas retroativamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteSeg.isPending}>
              {deleteSeg.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            'fixed bottom-4 right-4 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium',
            toast.type === 'success' ? 'bg-botica-600 text-white' : 'bg-red-600 text-white',
          )}
        >
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
