import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage, ProtectedRoute } from '@/features/auth'
import { ContactsPage } from '@/features/contacts'
import { CampaignsPage } from '@/features/campaigns/ui/campaigns-page'
import { CashbackPage } from '@/features/cashback/ui/cashback-page'
import { ReportsPage } from '@/features/reports/ui/reports-page'
import { SettingsPage } from '@/features/settings/ui/settings-page'
import { AppLayout } from '@/shared/layout/app-layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/contacts" replace />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/cashback" element={<CashbackPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/contacts" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
