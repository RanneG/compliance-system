import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Analytics from './pages/Analytics'
import Contractor from './pages/Contractor'
import Dashboard from './pages/Dashboard'
import Legal from './pages/Legal'
import Login from './pages/Login'
import NewPermit from './pages/NewPermit'
import PermitDetail from './pages/PermitDetail'
import Vault from './pages/Vault'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Legal kind="terms" />} />
        <Route path="/privacy" element={<Legal kind="privacy" />} />
        <Route path="/p/:token" element={<Contractor />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Dashboard mode="tasks" />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/permits/new" element={<NewPermit />} />
            <Route path="/permits/:id" element={<PermitDetail />} />
            <Route path="/vault" element={<Vault />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
