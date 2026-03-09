import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui/dialog'
import { cn, formatPhone } from '@/shared/lib/utils'
import { normalizePhone } from '../api/contacts-api'
import { LIFECYCLE_STAGES, CONTACT_STATUSES, EMAIL_STATUSES, PHONE_STATUSES } from '../types'
import type { Contact, CreateContactInput, UpdateContactInput } from '../types'

interface ContactFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact | null
  onSave: (data: CreateContactInput | { id: string; input: UpdateContactInput }) => Promise<void>
  isPending?: boolean
}

export function ContactFormDialog({ open, onOpenChange, contact, onSave, isPending }: ContactFormDialogProps) {
  const isEdit = !!contact

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [lifecycleStage, setLifecycleStage] = useState('lead')
  const [status, setStatus] = useState('active')
  const [tagsText, setTagsText] = useState('')
  const [cashbackBalance, setCashbackBalance] = useState('0')
  const [emailStatus, setEmailStatus] = useState('active')
  const [phoneStatus, setPhoneStatus] = useState('active')

  useEffect(() => {
    if (open && contact) {
      setFullName(contact.fullName)
      setEmail(contact.email)
      setPhone(contact.phone ?? '')
      setLifecycleStage(contact.lifecycleStage)
      setStatus(contact.status)
      setTagsText(contact.tags.join(', '))
      setCashbackBalance(String(contact.cashbackInfo?.currentBalance ?? 0))
      setEmailStatus(contact.emailStatus ?? 'active')
      setPhoneStatus(contact.phoneStatus ?? 'active')
    } else if (open && !contact) {
      setFullName('')
      setEmail('')
      setPhone('')
      setLifecycleStage('lead')
      setStatus('active')
      setTagsText('')
      setCashbackBalance('0')
      setEmailStatus('active')
      setPhoneStatus('active')
    }
  }, [open, contact])

  const handleSubmit = useCallback(async () => {
    const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean)
    const normalizedPhone = phone.trim() ? normalizePhone(phone.trim()) : undefined

    if (isEdit && contact) {
      await onSave({
        id: contact.id,
        input: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: normalizedPhone ?? null,
          lifecycleStage,
          tags,
          status,
          emailStatus,
          phoneStatus,
        },
      })
    } else {
      await onSave({
        email: email.trim(),
        phone: normalizedPhone,
        fullName: fullName.trim(),
        lifecycleStage,
        cashbackBalance: parseFloat(cashbackBalance) || 0,
        tags,
        source: 'manual_input',
      } satisfies CreateContactInput)
    }
  }, [isEdit, contact, fullName, email, phone, lifecycleStage, status, tagsText, cashbackBalance, emailStatus, phoneStatus, onSave])

  const canSubmit = fullName.trim() && email.trim() && !isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize as informações do contato.' : 'Preencha os dados para cadastrar um novo contato.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Row: Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cf-name" className="text-sm font-medium text-slate-700">
                Nome Completo <span className="text-red-500">*</span>
              </Label>
              <Input id="cf-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" autoFocus />
            </div>
            <div>
              <Label htmlFor="cf-email" className="text-sm font-medium text-slate-700">
                E-mail <span className="text-red-500">*</span>
              </Label>
              <Input id="cf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Row: Phone + Cashback/Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cf-phone" className="text-sm font-medium text-slate-700">Telefone</Label>
              <Input id="cf-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
              {phone.trim() && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatPhone(normalizePhone(phone.trim()))}
                </p>
              )}
            </div>
            {!isEdit ? (
              <div>
                <Label htmlFor="cf-cashback" className="text-sm font-medium text-slate-700">Saldo Cashback Inicial (R$)</Label>
                <Input
                  id="cf-cashback"
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashbackBalance}
                  onChange={(e) => setCashbackBalance(e.target.value)}
                  className="mt-1"
                />
              </div>
            ) : (
              <div>
                <Label className="text-sm font-medium text-slate-700">Status</Label>
                <div className="flex gap-2 mt-1.5">
                  {CONTACT_STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatus(s.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer',
                        status === s.value
                          ? `${s.color} border-current`
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lifecycle Stage */}
          <div>
            <Label className="text-sm font-medium text-slate-700">Estágio do Ciclo</Label>
            <div className="flex gap-2 mt-1.5">
              {LIFECYCLE_STAGES.map((ls) => (
                <button
                  key={ls.value}
                  type="button"
                  onClick={() => setLifecycleStage(ls.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer',
                    lifecycleStage === ls.value
                      ? `${ls.color} border-current`
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {ls.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="cf-tags" className="text-sm font-medium text-slate-700">Tags</Label>
            <Input id="cf-tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} className="mt-1" placeholder="Separe por vírgula" />
          </div>

          {/* Channel Health (edit only) */}
          {isEdit && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-slate-700">Saúde dos Canais</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-600">Status do E-mail</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {EMAIL_STATUSES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setEmailStatus(s.value)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer',
                          emailStatus === s.value
                            ? `${s.color} border-current`
                            : 'border-slate-200 text-slate-500 hover:bg-white',
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {contact?.emailFailReason && emailStatus !== 'active' && (
                    <p className="text-[10px] text-red-500 mt-1">{contact.emailFailReason}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">Status do Telefone</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {PHONE_STATUSES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setPhoneStatus(s.value)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer',
                          phoneStatus === s.value
                            ? `${s.color} border-current`
                            : 'border-slate-200 text-slate-500 hover:bg-white',
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(emailStatus !== 'active' || phoneStatus !== 'active') && (
                <p className="text-[10px] text-slate-500">
                  Alterar o status para "Ativo" reativará o canal para envios. Use com cuidado.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending ? (isEdit ? 'Salvando...' : 'Criando...') : (isEdit ? 'Salvar' : 'Criar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
