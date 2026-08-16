import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import StatusBadge from '../components/StatusBadge'
import type { DashboardPayload, PermitStatus } from '../types'
import { formatRelative, initials } from '../lib/format'

type Mode = 'all' | 'tasks'

export default function Dashboard({ mode = 'all' }: { mode?: Mode }) {
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [status, setStatus] = useState<'all' | PermitStatus>(mode === 'tasks' ? 'pending_user' : 'all')
  const [error, setError] = useState('')

  function load() {
    api
      .dashboard()
      .then(setData)
      .catch((err: Error) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  const query = q.toLowerCase()
  const rows = (data?.permits || []).filter((row) => {
    const statusOk = status === 'all' || row.status === status
    const taskOk =
      mode !== 'tasks' ||
      row.status === 'pending_user' ||
      row.status === 'pending_review' ||
      row.status === 'active'
    const text = `${row.id} ${row.equipment_sn} ${row.location} ${row.created_by} ${row.contractor_name || ''}`.toLowerCase()
    const queryOk = !query || text.includes(query)
    return statusOk && taskOk && queryOk
  })

  const counts = data?.counts
  const pending = counts?.awaiting_review ?? 0

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>{mode === 'tasks' ? 'My tasks' : 'Permit Dashboard'}</h2>
          <p className="lede">
            {mode === 'tasks'
              ? 'Active field work and records waiting on authorized-person review.'
              : 'Manage and track all Permit to Work (PTW) operations.'}
          </p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="stats">
        <article className="stat stat-primary">
          <div>
            <span>Total Permits</span>
            <strong>{counts?.total ?? 0}</strong>
          </div>
          <span className="stat-icon blue">
            <IconDoc />
          </span>
        </article>
        <article className="stat">
          <div>
            <span>With engineer</span>
            <strong>{counts?.active ?? 0}</strong>
          </div>
          <span className="stat-icon amber">
            <IconWrench />
          </span>
        </article>
        <article className="stat">
          <div>
            <span>Awaiting Review</span>
            <strong>{pending}</strong>
            {pending > 0 && <em className="req">Action Req</em>}
          </div>
          <span className="stat-icon red">
            <IconAlert />
          </span>
        </article>
        <article className="stat">
          <div>
            <span>Closed</span>
            <strong>{counts?.completed ?? 0}</strong>
          </div>
          <span className="stat-icon green">
            <IconCheck />
          </span>
        </article>
      </div>
      <section className="table-card">
        <div className="table-toolbar">
          <h3>Recent Permits</h3>
          <div className="table-tools">
            <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | PermitStatus)}>
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">With engineer</option>
              <option value="pending_user">User review</option>
              <option value="pending_review">AP(D) review</option>
              <option value="completed">Closed</option>
            </select>
            <button type="button" className="icon-btn" onClick={load} aria-label="Refresh">
              <IconRefresh />
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PTW No</th>
                <th>Equipment SN</th>
                <th>Hospital</th>
                <th>Status</th>
                <th>Assigned Engineer</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link to={`/permits/${row.id}`}>{row.id}</Link>
                  </td>
                  <td className="mono">{row.equipment_sn}</td>
                  <td>{row.location}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td>
                    <span className="person">
                      <span className="avatar sm">{initials(row.created_by)}</span>
                      {row.created_by}
                    </span>
                  </td>
                  <td>{formatRelative(row.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="empty">No permits match this view.</p>}
        </div>
        <footer className="table-foot">
          Showing {rows.length} of {data?.permits.length ?? 0} records
        </footer>
      </section>
    </div>
  )
}

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}
function IconWrench() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.7 6.3a5 5 0 0 0-7 7L3 18l3 3 4.7-4.7a5 5 0 0 0 7-7l-3.2 3.2-2.8-2.8z" />
    </svg>
  )
}
function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M12 11v4M12 18h.01" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  )
}
function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}
