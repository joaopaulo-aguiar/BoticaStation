import { Ticket } from 'lucide-react'

export function CouponsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-pink-100 text-pink-700">
          <Ticket className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cupons</h1>
          <p className="text-xs text-slate-500">Gestão de cupons de desconto e promoções</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-12 text-center">
        <Ticket className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Módulo em desenvolvimento.</p>
      </div>
    </div>
  )
}
