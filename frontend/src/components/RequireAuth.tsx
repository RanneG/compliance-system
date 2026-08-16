import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getSession } from '../auth'

export default function RequireAuth() {
  const location = useLocation()
  if (!getSession()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
