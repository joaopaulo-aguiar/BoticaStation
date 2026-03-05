import { useState, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import { Upload, AlertCircle, Check, FileSpreadsheet, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { normalizePhone } from '../api/contacts-api'
import type { CreateContactInput } from '../types'

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (contacts: CreateContactInput[]) => Promise<void>
  isPending?: boolean
}

interface ParsedRow {
  fullName: string
  email: string
  phone: string
  lifecycleStage: string
  tags: string
  valid: boolean
  error?: string
}

export function ImportCsvDialog({ open, onOpenChange, onImport, isPending }: ImportCsvDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const validCount = rows.filter(r => r.valid).length
  const invalidCount = rows.filter(r => !r.valid).length

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError(null)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data.length) {
          setParseError('Arquivo vazio ou sem dados.')
          setRows([])
          return
        }

        const headers = Object.keys(result.data[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
        const hasEmail = headers.includes('email')
        const hasName = headers.includes('full_name') || headers.includes('nome') || headers.includes('name')

        if (!hasEmail || !hasName) {
          setParseError(`Colunas obrigatórias: email, full_name (ou nome/name). Encontradas: ${headers.join(', ')}`)
          setRows([])
          return
        }

        const parsed: ParsedRow[] = result.data.map((raw) => {
          const norm: Record<string, string> = {}
          for (const [k, v] of Object.entries(raw)) {
            norm[k.trim().toLowerCase().replace(/\s+/g, '_')] = String(v ?? '').trim()
          }

          const fullName = norm['full_name'] || norm['nome'] || norm['name'] || ''
          const email = norm['email'] || ''
          const phone = norm['phone'] || norm['telefone'] || norm['tel'] || ''
          const lifecycleStage = norm['lifecycle_stage'] || norm['estagio'] || 'lead'
          const tags = norm['tags'] || ''

          const errors: string[] = []
          if (!fullName) errors.push('nome vazio')
          if (!email) errors.push('email vazio')
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email inválido')

          return {
            fullName,
            email,
            phone,
            lifecycleStage,
            tags,
            valid: errors.length === 0,
            error: errors.length ? errors.join(', ') : undefined,
          }
        })

        setRows(parsed)
      },
      error: (err) => {
        setParseError(err.message)
        setRows([])
      },
    })
  }, [])

  const handleImport = useCallback(async () => {
    const validRows = rows.filter(r => r.valid)
    const inputs: CreateContactInput[] = validRows.map(r => ({
      email: r.email,
      phone: r.phone ? normalizePhone(r.phone) : undefined,
      fullName: r.fullName,
      lifecycleStage: r.lifecycleStage || 'lead',
      tags: r.tags ? r.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      source: 'import_csv',
    }))
    await onImport(inputs)
  }, [rows, onImport])

  const handleClose = useCallback(() => {
    setRows([])
    setFileName(null)
    setParseError(null)
    if (fileRef.current) fileRef.current.value = ''
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose} className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar Contatos (CSV)</DialogTitle>
          <DialogDescription>
            Selecione um arquivo CSV com as colunas: <strong>email</strong>, <strong>full_name</strong> (obrigatórias),
            phone, lifecycle_stage, tags (opcionais).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input */}
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="shrink-0">
              <Upload className="w-4 h-4 mr-1.5" />
              Selecionar CSV
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            {fileName && (
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
                <span className="text-sm text-slate-700 truncate">{fileName}</span>
              </div>
            )}
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <>
              {/* Stats */}
              <div className="flex items-center gap-3">
                <Badge className="bg-slate-100 text-slate-700">{rows.length} linhas</Badge>
                <Badge className="bg-green-100 text-green-700">{validCount} válidos</Badge>
                {invalidCount > 0 && (
                  <Badge className="bg-red-100 text-red-700">{invalidCount} inválidos</Badge>
                )}
              </div>

              {/* Preview table */}
              <div className="max-h-60 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">#</th>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">Nome</th>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">E-mail</th>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">Telefone</th>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">Estágio</th>
                      <th className="px-2 py-1.5 text-left font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 100).map((row, i) => (
                      <tr key={i} className={cn(!row.valid && 'bg-red-50')}>
                        <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                        <td className="px-2 py-1 text-slate-700 max-w-[120px] truncate">{row.fullName}</td>
                        <td className="px-2 py-1 text-slate-700 max-w-[150px] truncate">{row.email}</td>
                        <td className="px-2 py-1 text-slate-500">{row.phone || '—'}</td>
                        <td className="px-2 py-1 text-slate-500">{row.lifecycleStage}</td>
                        <td className="px-2 py-1">
                          {row.valid ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <span className="text-red-500" title={row.error}><X className="w-3.5 h-3.5 inline" /> {row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 100 && (
                  <div className="px-2 py-1.5 text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
                    Mostrando 100 de {rows.length} linhas
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleImport} disabled={validCount === 0 || isPending}>
            <Upload className="w-3.5 h-3.5 mr-1" />
            {isPending ? 'Importando...' : `Importar ${validCount} contato${validCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
