import { useState } from 'react'
import {
  useContacts,
  useDeleteContact,
} from '@/features/contacts/hooks/use-contacts'
import { ContactFormDialog } from './contact-form-dialog'
import { ImportCSVDialog } from './import-csv-dialog'
import { EmailActivityDialog } from './email-activity-dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Input,
} from '@/shared/ui'
import {
  Plus,
  Upload,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Users,
  AlertCircle,
  Mail,
} from 'lucide-react'
import { formatPhone, formatCurrency } from '@/shared/lib/utils'
import type { Contact } from '@/shared/types'

const lifecycleBadge: Record<string, { label: string; variant: 'customer' | 'lead' | 'subscriber' }> = {
  customer: { label: 'Customer', variant: 'customer' },
  lead: { label: 'Lead', variant: 'lead' },
  subscriber: { label: 'Subscriber', variant: 'subscriber' },
}

export function ContactsPage() {
  const { data: contacts, isLoading, error } = useContacts()
  const deleteMutation = useDeleteContact()

  const [search, setSearch] = useState('')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [activityEmail, setActivityEmail] = useState<string | null>(null)
  const [activityContactName, setActivityContactName] = useState<string | undefined>()
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)

  const filtered = (contacts ?? []).filter((c) => {
    const q = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    )
  })

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setFormDialogOpen(true)
  }

  const handleDelete = (contact: Contact) => {
    if (window.confirm(`Excluir o contato "${contact.full_name}"?`)) {
      deleteMutation.mutate(contact.PK)
    }
  }

  const handleNewContact = () => {
    setEditingContact(null)
    setFormDialogOpen(true)
  }

  const handleOpenActivity = (contact: Contact) => {
    setActivityEmail(contact.email)
    setActivityContactName(contact.full_name)
    setActivityDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-botica-100 text-botica-700">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contatos</h1>
          <p className="text-xs text-slate-500">Gestão completa de contatos e clientes</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar contato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Upload className="w-4 h-4" />
              Importar CSV
            </Button>
            <Button size="sm" onClick={handleNewContact}>
              <Plus className="w-4 h-4" />
              Novo Contato
            </Button>
          </div>
        </div>

        {/* Stats row */}
        {contacts && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Total: <strong className="text-slate-700">{contacts.length}</strong>
            </span>
            <span className="text-xs text-slate-500">
              Customers:{' '}
              <strong className="text-emerald-600">
                {contacts.filter((c) => c.lifecycle_stage === 'customer').length}
              </strong>
            </span>
            <span className="text-xs text-slate-500">
              Leads:{' '}
              <strong className="text-blue-600">
                {contacts.filter((c) => c.lifecycle_stage === 'lead').length}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-botica-600" />
            <span className="ml-2 text-sm text-slate-500">Carregando contatos...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 px-4">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Erro ao carregar contatos'}
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {search ? 'Nenhum contato encontrado.' : 'Nenhum contato cadastrado ainda.'}
            </p>
            {!search && (
              <Button size="sm" className="mt-3" onClick={handleNewContact}>
                <Plus className="w-4 h-4" />
                Adicionar primeiro contato
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Nome Completo</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead className="text-right">Saldo Cashback</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow key={contact.PK}>
                  <TableCell className="font-medium text-slate-900">
                    {contact.full_name}
                  </TableCell>
                  <TableCell className="text-slate-600">{contact.email}</TableCell>
                  <TableCell className="text-slate-600 font-mono text-xs">
                    {formatPhone(contact.phone)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={lifecycleBadge[contact.lifecycle_stage]?.variant ?? 'default'}>
                      {lifecycleBadge[contact.lifecycle_stage]?.label ?? contact.lifecycle_stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatCurrency(contact.cashback_info?.current_balance ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={contact.status === 'inactive' ? 'inactive' : 'active'}>
                      {contact.status === 'inactive' ? 'Inativo' : 'Ativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenActivity(contact)}
                        title="Atividade de E-mail"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(contact)}
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(contact)}
                        disabled={deleteMutation.isPending}
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Dialogs */}
      <ContactFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        contact={editingContact}
      />
      <ImportCSVDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <EmailActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        email={activityEmail}
        contactName={activityContactName}
      />
    </div>
  )
}
