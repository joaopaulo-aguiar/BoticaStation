import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from '@/shared/ui'
import { useImportContacts } from '@/features/contacts/hooks/use-contacts'
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react'
import type { ContactFormData } from '@/shared/types'

interface ImportCSVDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ParsedRow {
  full_name?: string
  name?: string
  nome?: string
  email?: string
  phone?: string
  telefone?: string
  lifecycle_stage?: string
  estagio?: string
  tags?: string
}

export function ImportCSVDialog({ open, onOpenChange }: ImportCSVDialogProps) {
  const importMutation = useImportContacts()
  const [file, setFile] = useState<File | null>(null)
  const [parsedContacts, setParsedContacts] = useState<ContactFormData[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)

  const resetState = useCallback(() => {
    setFile(null)
    setParsedContacts([])
    setParseError(null)
    setResult(null)
  }, [])

  const mapRowToContact = (row: ParsedRow): ContactFormData | null => {
    const name = row.full_name || row.name || row.nome || ''
    const email = row.email || ''
    const phone = row.phone || row.telefone || ''

    if (!name && !email) return null

    const stage = (row.lifecycle_stage || row.estagio || 'lead').toLowerCase()
    const validStages = ['customer', 'subscriber', 'lead']
    const lifecycle_stage = validStages.includes(stage) ? stage as ContactFormData['lifecycle_stage'] : 'lead'

    const tags = row.tags
      ? row.tags.split(';').map((t: string) => t.trim()).filter(Boolean)
      : []

    return {
      full_name: name,
      email,
      phone,
      lifecycle_stage,
      cashback_balance: 0,
      tags,
    }
  }

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile)
    setParseError(null)
    setResult(null)

    Papa.parse<ParsedRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(`Erros no CSV: ${results.errors.map((e) => e.message).join(', ')}`)
          return
        }

        const contacts = results.data
          .map(mapRowToContact)
          .filter((c): c is ContactFormData => c !== null)

        if (contacts.length === 0) {
          setParseError(
            'Nenhum contato válido encontrado. Verifique se o CSV possui colunas: name/full_name, email, phone.'
          )
          return
        }

        setParsedContacts(contacts)
      },
      error: (err: Error) => {
        setParseError(`Erro ao ler CSV: ${err.message}`)
      },
    })
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
        handleFile(droppedFile)
      } else {
        setParseError('Por favor, selecione um arquivo CSV válido.')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFile(selectedFile)
  }

  const handleImport = async () => {
    try {
      const res = await importMutation.mutateAsync(parsedContacts)
      setResult(res)
    } catch {
      // handled by mutation
    }
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Contatos</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV para importar contatos em lote.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* Result Screen */
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Importação Concluída</h3>
            <div className="flex justify-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{result.success}</p>
                <p className="text-xs text-slate-500">Importados</p>
              </div>
              {result.failed > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                  <p className="text-xs text-slate-500">Falharam</p>
                </div>
              )}
            </div>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          <>
            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-botica-500 bg-botica-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-botica-600" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button onClick={resetState} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 mb-1">
                    Arraste um arquivo CSV aqui ou{' '}
                    <label className="text-botica-600 font-medium cursor-pointer hover:underline">
                      clique para selecionar
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileInput}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-slate-400">
                    Colunas esperadas: name, email, phone, lifecycle_stage, tags
                  </p>
                </>
              )}
            </div>

            {/* Parse Error */}
            {parseError && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">{parseError}</p>
              </div>
            )}

            {/* Preview */}
            {parsedContacts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {parsedContacts.length} contatos prontos para importar
                  </p>
                  <Badge variant="default">{parsedContacts.length} registros</Badge>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5 text-slate-500 font-medium">Nome</th>
                        <th className="text-left px-2 py-1.5 text-slate-500 font-medium">E-mail</th>
                        <th className="text-left px-2 py-1.5 text-slate-500 font-medium">Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedContacts.slice(0, 10).map((c, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-2 py-1 text-slate-900">{c.full_name}</td>
                          <td className="px-2 py-1 text-slate-600">{c.email}</td>
                          <td className="px-2 py-1">
                            <Badge
                              variant={
                                c.lifecycle_stage === 'customer'
                                  ? 'customer'
                                  : c.lifecycle_stage === 'lead'
                                  ? 'lead'
                                  : 'subscriber'
                              }
                            >
                              {c.lifecycle_stage}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {parsedContacts.length > 10 && (
                        <tr className="border-t border-slate-100">
                          <td colSpan={3} className="px-2 py-1 text-slate-400 text-center">
                            ... e mais {parsedContacts.length - 10} contatos
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importMutation.error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-xs text-red-700">
                  {importMutation.error instanceof Error
                    ? importMutation.error.message
                    : 'Erro ao importar contatos'}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedContacts.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importar {parsedContacts.length} contatos
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
