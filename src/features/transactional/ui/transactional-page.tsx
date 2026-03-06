import { ArrowRightLeft } from 'lucide-react'

export function TransactionalPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 text-violet-700">
          <ArrowRightLeft className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Transacionais</h1>
          <p className="text-xs text-slate-500">E-mails e comunicações transacionais da plataforma</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-12 text-center">
        <ArrowRightLeft className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-600 mb-1">Comunicações Transacionais</p>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Gerencie e-mails transacionais como confirmações de pedido, notificações de envio,
          recuperação de senha e outras comunicações automáticas da plataforma.
        </p>
      </div>
    </div>
  )
}
