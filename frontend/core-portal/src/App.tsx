import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import PartnersPage from './pages/PartnersPage'
import KnowledgeUpdatesPage from './pages/KnowledgeUpdatesPage'
import KnowledgeUpdateDetailPage from './pages/KnowledgeUpdateDetailPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login route */}
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/partners" element={<PartnersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/knowledge-updates" element={<KnowledgeUpdatesPage />} />
              <Route path="/knowledge-updates/:id" element={<KnowledgeUpdateDetailPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
