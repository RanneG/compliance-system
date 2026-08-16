import type { DashboardPayload, Permit } from './types'
import { accessQuery, authHeaders, getSession } from './auth'

const API = '/api'

async function parse<T>(res: Response): Promise<T> {
  if (
    res.status === 401 &&
    !window.location.pathname.startsWith('/login') &&
    !window.location.pathname.startsWith('/p/')
  ) {
    window.location.href = '/login'
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || JSON.stringify(body)
    } catch {
      detail = await res.text()
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
  }
  return res.json() as Promise<T>
}

function jsonHeaders() {
  return authHeaders({ 'Content-Type': 'application/json' })
}

export const api = {
  login: (username: string, password: string) =>
    fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then((res) => parse<{ token: string; name: string }>(res)),
  logout: () =>
    fetch(`${API}/auth/logout`, { method: 'POST', headers: authHeaders() }).then((res) =>
      parse<{ status: string }>(res),
    ),
  dashboard: () => fetch(`${API}/dashboard`, { headers: authHeaders() }).then((res) => parse<DashboardPayload>(res)),
  permits: (params?: { status?: string; q?: string; vault?: boolean }) => {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.q) query.set('q', params.q)
    if (params?.vault) query.set('vault', 'true')
    const suffix = query.toString() ? `?${query}` : ''
    return fetch(`${API}/permits${suffix}`, { headers: authHeaders() }).then((res) => parse<Permit[]>(res))
  },
  permit: (id: string) => fetch(`${API}/permits/${id}`, { headers: authHeaders() }).then((res) => parse<Permit>(res)),
  createPermit: (body: {
    equipment_sn: string
    equipment_name: string
    location: string
    nature_of_work: string
    description: string
    decontaminated: boolean
    signature_png?: string
    created_by: string
  }) =>
    fetch(`${API}/permits`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    }).then((res) => parse<Permit>(res)),
  activate: (id: string, actor: string) =>
    fetch(`${API}/permits/${id}/activate`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ actor, public_base: window.location.origin }),
    }).then((res) => parse<Permit>(res)),
  userReview: (
    id: string,
    body: { actor: string; accepted_fit: boolean; signature_png: string; not_fit_details?: string },
  ) =>
    fetch(`${API}/permits/${id}/user-review`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    }).then((res) => parse<Permit>(res)),
  audit: (id: string, actor: string, signature_png?: string) =>
    fetch(`${API}/permits/${id}/audit`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ actor, signature_png }),
    }).then((res) => parse<Permit>(res)),
  access: (token: string) => fetch(`${API}/access/${token}`).then((res) => parse<Permit>(res)),
  declare: (token: string, body: { signer_name: string; signature_png: string; acknowledged: boolean }) =>
    fetch(`${API}/access/${token}/declaration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((res) => parse<Permit>(res)),
  uploadEvidence: (token: string, file: File) => {
    const data = new FormData()
    data.append('file', file)
    return fetch(`${API}/access/${token}/evidence`, { method: 'POST', body: data }).then((res) =>
      parse<{ id: string; original_name: string; stored_name: string }>(res),
    )
  },
  handover: (
    token: string,
    body: {
      work_details: string
      fit_for_purpose: boolean
      signer_name: string
      signature_png: string
      not_fit_reason?: string
    },
  ) =>
    fetch(`${API}/access/${token}/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((res) => parse<Permit>(res)),
  qrUrl: (id: string) =>
    `${API}/permits/${id}/qr.png?public_base=${encodeURIComponent(window.location.origin)}${accessQuery()}`,
  evidenceUrl: (stored: string) => `${API}/evidence/${stored}?access=${encodeURIComponent(getSession()?.token || '')}`,
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}
