import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Users, Plus, Search, Trash2, Pencil, Upload, RefreshCw,
  ChevronLeft, ChevronRight, MoreVertical, AlertCircle, Check, Filter, X,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store/auth-store'
import {
  useContactsList,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useImportContacts,
} from '../hooks/use-contacts'
import { ContactFormDialog } from './contact-form-dialog'
import { ImportCsvDialog } from './import-csv-dialog'
import {
  LIFECYCLE_STAGES,
  CONTACT_STATUSES,
} from '../types'
import type {
  Contact,
  ContactFilterInput,
  ContactSortInput,
  CreateContactInput,
  UpdateContactInput,
} from '../types'

// ── Contacts Page ────────────────────────────────────────────────────────────

export function ContactsPage() {
  const userRole = useAuthStore((s) => s.userRole)

  // ── Filters & pagination ──
  const [search, setSearch] = useState('')
  const [filterLifecycle, setFilterLifecycle] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [pageSize] = useState(50)
  const [nextToken, setNextToken] = useState<string | null>(null)
  const [tokenHistory, setTokenHistory] = useState<(string | null)[]>([null])
  const [sort] = useState<ContactSortInput>({ field: 'CREATED_AT', direction: 'DESC' })

  const filter = useMemo<ContactFilterInput | null>(() => {
    const f: ContactFilterInput = {}
    if (search.trim()) f.search = search.trim()
    if (filterLifecycle) f.lifecycleStage = filterLifecycle
    if (filterStatus) f.status = filterStatus
    return Object.keys(f).length ? f : null
  }, [search, filterLifecycle, filterStatus])

  const { data, isLoading, refetch } = useContactsList(pageSize, nextToken, filter, sort)
  const contacts = data?.items ?? []
  const hasNextPage = !!data?.nextToken
  const currentPageIndex = tokenHistory.indexOf(nextToken)

  // ── Mutations ──
  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const deleteContact = useDeleteContact()
  const importContacts = useImportContacts()

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === contacts.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(contacts.map(c => c.id)))
  }, [selectedIds, contacts])

  // ── Dialogs ──
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // ── Context menu ──
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; contact: Contact } | null>(null)
  const ctxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    if (contextMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // ── Handlers ──
  const handleNew = useCallback(() => {
    setEditingContact(null)
    setFormDialogOpen(true)
  }, [])

  const handleEdit = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setFormDialogOpen(true)
    setContextMenu(null)
  }, [])

  const handleFormSave = useCallback(async (data: CreateContactInput | { id: string; input: UpdateContactInput }) => {
    try {
      if ('id' in data) {
        await updateContact.mutateAsync(data)
        showToast('Contato atualizado!')
      } else {
        await createContact.mutateAsync(data)
        showToast('Contato criado!')
      }
      setFormDialogOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao salvar contato', 'error')
    }
  }, [createContact, updateContact, showToast])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteContact.mutateAsync(deleteTarget.id)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      showToast('Contato excluído')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir', 'error')
    }
  }, [deleteTarget, deleteContact, showToast])

  const handleImport = useCallback(async (inputs: CreateContactInput[]) => {
    try {
      const result = await importContacts.mutateAsync(inputs)
      showToast(`Importação concluída: ${result.success} sucesso, ${result.failed} falhas`)
      setImportDialogOpen(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro na importação', 'error')
    }
  }, [importContacts, showToast])

  const handleNextPage = useCallback(() => {
    if (data?.nextToken) {
      setTokenHistory((prev) => [...prev, data.nextToken!])
      setNextToken(data.nextToken)
    }
  }, [data])

  const handlePrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      const prevToken = tokenHistory[currentPageIndex - 1]
      setNextToken(prevToken)
    }
  }, [currentPageIndex, tokenHistory])

  const handleContextMenu = useCallback((e: React.MouseEvent, contact: Contact) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, contact })
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setFilterLifecycle(null)
    setFilterStatus(null)
    setNextToken(null)
    setTokenHistory([null])
  }, [])

  const canDelete = userRole === 'ADMIN' || userRole === 'GESTOR'
  const canImport = userRole === 'ADMIN'

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Contatos</h1>
            <p className="text-xs text-slate-500">
              {data?.totalCount != null ? `${data.totalCount} contatos` : 'Gerenciamento de contatos e clientes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canImport && (
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-3.5 h-3.5 mr-1" />
              Importar CSV
            </Button>
          )}
          <Button size="sm" onClick={handleNew}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo Contato
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setNextToken(null); setTokenHistory([null]) }}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Filter toggle */}
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5 mr-1" />
            Filtros
            {(filterLifecycle || filterStatus) && (
              <Badge className="ml-1 bg-white/20 text-[10px] px-1">
                {[filterLifecycle, filterStatus].filter(Boolean).length}
              </Badge>
            )}
          </Button>

          {/* Refresh */}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          </Button>

          {/* Clear filters */}
          {(search || filterLifecycle || filterStatus) && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              <X className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Filters row */}
        {showFilters && (
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            {/* Lifecycle filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Estágio:</span>
              <button
                onClick={() => setFilterLifecycle(null)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors',
                  !filterLifecycle ? 'bg-botica-100 text-botica-700 font-medium' : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                Todos
              </button>
              {LIFECYCLE_STAGES.map((ls) => (
                <button
                  key={ls.value}
                  onClick={() => { setFilterLifecycle(filterLifecycle === ls.value ? null : ls.value); setNextToken(null); setTokenHistory([null]) }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors',
                    filterLifecycle === ls.value ? `${ls.color} font-medium` : 'text-slate-500 hover:bg-slate-100',
                  )}
                >
                  {ls.label}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Status:</span>
              <button
                onClick={() => setFilterStatus(null)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors',
                  !filterStatus ? 'bg-botica-100 text-botica-700 font-medium' : 'text-slate-500 hover:bg-slate-100',
                )}
              >
                Todos
              </button>
              {CONTACT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { setFilterStatus(filterStatus === s.value ? null : s.value); setNextToken(null); setTokenHistory([null]) }}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] cursor-pointer transition-colors',
                    filterStatus === s.value ? `${s.color} font-medium` : 'text-slate-500 hover:bg-slate-100',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={contacts.length > 0 && selectedIds.size === contacts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">E-mail</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Telefone</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Estágio</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden xl:table-cell">Tags</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden xl:table-cell">Criado em</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                    Carregando contatos...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      {filter ? 'Nenhum contato encontrado com estes filtros.' : 'Nenhum contato cadastrado.'}
                    </p>
                    {!filter && (
                      <Button variant="outline" size="sm" className="mt-3" onClick={handleNew}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Novo Contato
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => {
                  const lifecycle = LIFECYCLE_STAGES.find(l => l.value === contact.lifecycleStage)
                  const statusInfo = CONTACT_STATUSES.find(s => s.value === contact.status)

                  return (
                    <tr
                      key={contact.id}
                      onContextMenu={(e) => handleContextMenu(e, contact)}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                          className="rounded border-slate-300"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-botica-100 text-botica-700 text-xs font-bold shrink-0">
                            {contact.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 truncate max-w-[180px]">{contact.fullName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 truncate max-w-[200px]">{contact.email}</td>
                      <td className="px-3 py-2.5 text-slate-500 hidden md:table-cell">{contact.phone || '—'}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        {lifecycle && (
                          <Badge className={cn('text-[10px]', lifecycle.color)}>{lifecycle.label}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        {statusInfo && (
                          <Badge className={cn('text-[10px]', statusInfo.color)}>{statusInfo.label}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden xl:table-cell">
                        <div className="flex gap-1 flex-wrap max-w-[150px]">
                          {contact.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} className="text-[9px] bg-slate-100 text-slate-600">{tag}</Badge>
                          ))}
                          {contact.tags.length > 3 && (
                            <Badge className="text-[9px] bg-slate-100 text-slate-600">+{contact.tags.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 hidden xl:table-cell">
                        {new Date(contact.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, contact }) }}
                          className="p-1 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100">
          <div className="text-xs text-slate-400">
            {contacts.length > 0 && (
              <span>Mostrando {contacts.length} contato{contacts.length !== 1 ? 's' : ''}</span>
            )}
            {selectedIds.size > 0 && (
              <span className="ml-2 text-botica-600 font-medium">{selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPageIndex <= 0}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-slate-500 px-2">Página {currentPageIndex + 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasNextPage}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={ctxRef}
          className="fixed z-[100] bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors cursor-pointer"
            onClick={() => handleEdit(contextMenu.contact)}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          {canDelete && (
            <button
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              onClick={() => {
                setDeleteTarget(contextMenu.contact)
                setDeleteDialogOpen(true)
                setContextMenu(null)
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <ContactFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        contact={editingContact}
        onSave={handleFormSave}
        isPending={createContact.isPending || updateContact.isPending}
      />

      {/* Import CSV Dialog */}
      <ImportCsvDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        isPending={importContacts.isPending}
      />

      {/* Delete Confirm */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Excluir Contato</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.fullName}</strong> ({deleteTarget?.email})? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteContact.isPending}>
              {deleteContact.isPending ? 'Excluindo...' : 'Excluir'}
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
