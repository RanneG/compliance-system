import { useEffect, useState } from 'react'
import { api } from '../api'
import type { DashboardPayload } from '../types'

export default function Analytics() {
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((err: Error) => setError(err.message))
  }, [])

  const counts = data?.counts
  const total = counts?.total || 1

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Analytics</h2>
          <p className="lede">Live distribution of Permit to Work records in this workspace.</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <section className="table-card">
        {[
          ['Draft', counts?.draft ?? 0],
          ['With engineer', counts?.active ?? 0],
          ['User review', counts?.pending_user ?? 0],
          ['AP(D) review', counts?.pending_review ?? 0],
          ['Closed', counts?.completed ?? 0],
        ].map(([label, value]) => (
          <div className="meter" key={String(label)}>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
            <div className="meter-track">
              <span style={{ width: `${(Number(value) / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
