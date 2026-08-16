import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import StatusBadge from '../components/StatusBadge'
import { formatStamp, NATURE_LABEL } from '../lib/format'
import type { Permit } from '../types'

export default function Vault() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Permit[]>([])
  const [error, setError] = useState('')

  async function search(term = q) {
    try {
      setRows(await api.permits({ vault: true, q: term }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vault unavailable.')
    }
  }

  useEffect(() => {
    void search('')
  }, [])

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Audit vault</h2>
          <p className="lede">Searchable repository of closed permits and signed records.</p>
        </div>
      </div>
      <form
        className="search-bar"
        onSubmit={(event) => {
          event.preventDefault()
          void search()
        }}
      >
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search permit ID, equipment, location, contractor"
        />
        <button type="submit" className="btn">Search</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Permit</th>
              <th>Equipment</th>
              <th>Location</th>
              <th>Nature</th>
              <th>Contractor</th>
              <th>Audited</th>
              <th>Status</th>
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
                <td>{NATURE_LABEL[row.nature_of_work]}</td>
                <td>{row.contractor_name || '—'}</td>
                <td>{formatStamp(row.audited_at)}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No vaulted permits match that query.</p>}
      </div>
    </div>
  )
}
