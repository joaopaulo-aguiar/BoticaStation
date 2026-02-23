import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@/shared/ui'
import { useCreateContact, useUpdateContact } from '@/features/contacts/hooks/use-contacts'
import { Loader2 } from 'lucide-react'
import type { Contact, ContactFormData } from '@/shared/types'

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact | null
}

export function ContactFormDialog({ open, onOpenChange, contact }: ContactFormDialogProps) {
  const createMutation = useCreateContact()
  const updateMutation = useUpdateContact()
  const isEditing = !!contact

  const [form, setForm] = useState<ContactFormData>({
    full_name: '',
    email: '',
    phone: '',
    lifecycle_stage: 'lead',
    cashback_balance: 0,
    tags: [],
  })
  const [tagsInput, setTagsInput] = useState('')

  useEffect(() => {
    if (contact) {
      setForm({
        full_name: contact.full_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        lifecycle_stage: contact.lifecycle_stage || 'lead',
        cashback_balance: contact.cashback_info?.current_balance ?? 0,
        tags: contact.tags || [],
      })
      setTagsInput((contact.tags || []).join(', '))
    } else {
      setForm({
        full_name: '',
        email: '',
        phone: '',
        lifecycle_stage: 'lead',
        cashback_balance: 0,
        tags: [],
      })
      setTagsInput('')
    }
  }, [contact, open])

  const handleChange = (field: keyof ContactFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = field === 'cashback_balance' ? parseFloat(e.target.value) || 0 : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data: ContactFormData = {
      ...form,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    }

    try {
      if (isEditing && contact) {
        await updateMutation.mutateAsync({ pk: contact.PK, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onOpenChange(false)
    } catch {
      // mutation error handled by React Query
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error || updateMutation.error

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do contato.'
              : 'Preencha os dados para criar um novo contato.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={handleChange('full_name')}
              placeholder="João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="joao@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={handleChange('phone')}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lifecycle_stage">Lifecycle Stage</Label>
              <select
                id="lifecycle_stage"
                value={form.lifecycle_stage}
                onChange={handleChange('lifecycle_stage')}
                className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-botica-500"
              >
                <option value="lead">Lead</option>
                <option value="subscriber">Subscriber</option>
                <option value="customer">Customer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cashback_balance">Saldo Cashback (R$)</Label>
              <Input
                id="cashback_balance"
                type="number"
                step="0.01"
                min="0"
                value={form.cashback_balance}
                onChange={handleChange('cashback_balance')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="vip, manipulados, dermatologia"
            />
          </div>

          {mutationError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-xs text-red-700">
                {mutationError instanceof Error ? mutationError.message : 'Erro ao salvar contato'}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : isEditing ? (
                'Atualizar'
              ) : (
                'Criar Contato'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
