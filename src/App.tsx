import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage, ProtectedRoute } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard/ui/dashboard-page'
import { ContactsPage } from '@/features/contacts'
import { AutomationsPage } from '@/features/automations'
import { CampaignsPage } from '@/features/campaigns/ui/campaigns-page'
import { TransactionalPage } from '@/features/transactional/ui/transactional-page'
import { CashbackPage } from '@/features/cashback/ui/cashback-page'
import { ReportsPage } from '@/features/reports/ui/reports-page'
import { SettingsPage } from '@/features/settings/ui/settings-page'
import { AppLayout } from '@/shared/layout/app-layout'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/transactional" element={<TransactionalPage />} />
            <Route path="/cashback" element={<CashbackPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
