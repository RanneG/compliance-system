const KEY = 'ics.auth'

export type Session = { token: string; name: string }

export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    if (!parsed?.token) return null
    return parsed
  } catch {
    return null
  }
}

export function setSession(session: Session) {
  sessionStorage.setItem(KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(KEY)
}

export function authHeaders(extra?: Record<string, string>) {
  const session = getSession()
  return {
    ...(extra || {}),
    ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
  }
}

export function accessQuery() {
  const session = getSession()
  return session ? `&access=${encodeURIComponent(session.token)}` : ''
}
