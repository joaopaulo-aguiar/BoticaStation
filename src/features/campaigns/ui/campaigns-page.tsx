import { Send } from 'lucide-react'

export function CampaignsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100 text-teal-700">
          <Send className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Campanhas</h1>
          <p className="text-xs text-slate-500">Criação e envio de campanhas de e-mail</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 shadow-[var(--shadow-card)] p-12 text-center">
        <Send className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Módulo em desenvolvimento.</p>
      </div>
    </div>
  )
}
