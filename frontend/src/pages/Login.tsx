import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { getSession, setSession } from '../auth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from || '/'
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (getSession()) {
    return <Navigate to="/" replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const session = await api.login(username, password)
      setSession(session)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell">
      <form className="paper login-card" onSubmit={(event) => void submit(event)}>
        <div className="brand login-brand">
          <span className="mark">ICS</span>
          <div>
            <strong>Industrial Safety</strong>
            <small>Operational Control</small>
          </div>
        </div>
        <p className="kicker">Authorized person</p>
        <h2>Sign in</h2>
        <p className="lede">Manager console for Permit to Work. Engineers continue to use the QR link.</p>
        <label>
          Username
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={busy}>
          Sign in
        </button>
      </form>
    </div>
  )
}
