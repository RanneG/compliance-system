import { useEffect, useState } from 'react'
import { api } from '../api'
import ClusterBarTrendChart, { type BarSeries, type TrendLineSeries } from '../components/ClusterBarTrendChart'
import type { AnalyticsPayload } from '../types'

export default function Analytics() {
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [months, setMonths] = useState<number>(6)
  const [periodDays, setPeriodDays] = useState<number>(30)
  const [activeView, setActiveView] = useState<'flow' | 'status' | 'location' | 'nature'>('flow')

  const fetchAnalytics = () => {
    setLoading(true)
    setError('')
    api
      .analytics({ months, period_days: periodDays })
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchAnalytics()
  }, [months, periodDays])

  const counts = data?.current?.counts || {}
  const totalPermits = counts.total || 1
  const comparison = data?.comparison
  const quality = data?.quality
  const history = data?.history

  // 1. Data for Monthly Operational Flow Chart
  const flowCategories = data?.monthly_flow?.map((item) => item.label) || []
  const flowBarSeries: BarSeries[] = [
    {
      key: 'opened',
      label: 'Opened',
      color: '#1677ff', // Blue
      data: data?.monthly_flow?.map((item) => item.opened) || [],
    },
    {
      key: 'activated',
      label: 'Activated',
      color: '#dc6803', // Amber
      data: data?.monthly_flow?.map((item) => item.activated) || [],
    },
    {
      key: 'closed',
      label: 'Closed',
      color: '#12b76a', // Emerald Green
      data: data?.monthly_flow?.map((item) => item.closed) || [],
    },
  ]
  const flowTrendLine: TrendLineSeries = {
    key: 'cumulative_closed',
    label: 'Cumulative Closed',
    color: '#8a2be2', // Purple Glow
    data: data?.monthly_flow?.map((item) => item.cumulative_closed) || [],
    suffix: ' closed',
    useRightAxis: true,
  }

  // 2. Data for Monthly Status Evolution Chart
  const statusCategories = data?.monthly_status?.map((item) => item.label) || []
  const statusBarSeries: BarSeries[] = [
    {
      key: 'draft',
      label: 'Draft',
      color: '#98a2b3',
      data: data?.monthly_status?.map((item) => item.draft) || [],
    },
    {
      key: 'active',
      label: 'Active',
      color: '#1677ff',
      data: data?.monthly_status?.map((item) => item.active) || [],
    },
    {
      key: 'pending_review',
      label: 'Pending Review',
      color: '#dc6803',
      data: data?.monthly_status?.map((item) => (item.pending_user || 0) + (item.pending_review || 0)) || [],
    },
    {
      key: 'completed',
      label: 'Completed',
      color: '#12b76a',
      data: data?.monthly_status?.map((item) => item.completed) || [],
    },
  ]
  const statusTrendLine: TrendLineSeries = {
    key: 'completion_rate',
    label: 'Monthly Closed Volume',
    color: '#0284c7',
    data: data?.monthly_flow?.map((item) => item.closed) || [],
    suffix: ' permits',
  }

  // 3. Data for Site Location Breakdown Chart
  const locationCategories = data?.by_location?.map((item) => item.location) || []
  const locationBarSeries: BarSeries[] = [
    {
      key: 'active',
      label: 'Active Permits',
      color: '#1677ff',
      data: data?.by_location?.map((item) => item.active) || [],
    },
    {
      key: 'pending',
      label: 'Pending Review',
      color: '#dc6803',
      data: data?.by_location?.map((item) => (item.pending_user || 0) + (item.pending_review || 0)) || [],
    },
    {
      key: 'completed',
      label: 'Completed Vault',
      color: '#12b76a',
      data: data?.by_location?.map((item) => item.completed) || [],
    },
  ]
  const locationTrendLine: TrendLineSeries = {
    key: 'total_loc',
    label: 'Total Volume',
    color: '#6366f1',
    data: data?.by_location?.map((item) => item.total) || [],
    suffix: ' total',
    useRightAxis: false,
  }

  // 4. Data for Nature of Work Chart
  const natureCategories = data?.by_nature?.map((item) => item.nature.toUpperCase()) || []
  const natureBarSeries: BarSeries[] = [
    {
      key: 'open',
      label: 'Open Pipeline',
      color: '#dc6803',
      data: data?.by_nature?.map((item) => item.open) || [],
    },
    {
      key: 'completed',
      label: 'Completed',
      color: '#12b76a',
      data: data?.by_nature?.map((item) => item.completed) || [],
    },
    {
      key: 'recent',
      label: 'Recent (30d)',
      color: '#1677ff',
      data: data?.by_nature?.map((item) => item.recent) || [],
    },
  ]
  const natureTrendLine: TrendLineSeries = {
    key: 'total_nature',
    label: 'Total Scope',
    color: '#ec4899',
    data: data?.by_nature?.map((item) => item.total) || [],
    suffix: ' permits',
  }

  return (
    <div className="analytics-page">
      {/* Header Toolbar */}
      <div className="page-head analytics-head">
        <div>
          <h2>Analytics & Operational Performance</h2>
          <p className="lede">
            Historical operational throughput, clustered status breakdowns, and compliance trend indicators.
          </p>
        </div>
        <div className="analytics-toolbar">
          <div className="filter-group">
            <span className="filter-label">Horizon:</span>
            <button
              type="button"
              className={`filter-btn ${months === 3 ? 'active' : ''}`}
              onClick={() => {
                setMonths(3)
                setPeriodDays(30)
              }}
            >
              3 Months
            </button>
            <button
              type="button"
              className={`filter-btn ${months === 6 ? 'active' : ''}`}
              onClick={() => {
                setMonths(6)
                setPeriodDays(60)
              }}
            >
              6 Months
            </button>
            <button
              type="button"
              className={`filter-btn ${months === 12 ? 'active' : ''}`}
              onClick={() => {
                setMonths(12)
                setPeriodDays(90)
              }}
            >
              1 Year
            </button>
          </div>
          <button type="button" className="ghost refresh-btn" onClick={fetchAnalytics} disabled={loading}>
            <svg viewBox="0 0 24 24">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Top KPI Grid with Period Comparison Deltas */}
      <div className="analytics-kpi-grid">
        <div className="kpi-card highlight-blue">
          <div className="kpi-top">
            <span className="kpi-title">Current Open Pipeline</span>
            <span className="kpi-badge badge-active">Live</span>
          </div>
          <div className="kpi-body">
            <strong className="kpi-value">{data?.current?.open_pipeline ?? 0}</strong>
            <span className="kpi-subtext">Permits currently in progress</span>
          </div>
          <div className="kpi-footer">
            <span>Awaiting Review: <strong>{counts.awaiting_review ?? 0}</strong></span>
          </div>
        </div>

        <div className="kpi-card highlight-amber">
          <div className="kpi-top">
            <span className="kpi-title">Period Velocity ({periodDays}d)</span>
            {comparison?.delta?.created !== undefined && (
              <span className={`delta-badge ${comparison.delta.created >= 0 ? 'up' : 'down'}`}>
                {comparison.delta.created >= 0 ? `+${comparison.delta.created}` : comparison.delta.created} vs prev
              </span>
            )}
          </div>
          <div className="kpi-body">
            <strong className="kpi-value">{comparison?.current?.created ?? 0}</strong>
            <span className="kpi-subtext">New permits opened in window</span>
          </div>
          <div className="kpi-footer">
            <span>Activated: <strong>{comparison?.current?.activated ?? 0}</strong> | Closed: <strong>{comparison?.current?.completed ?? 0}</strong></span>
          </div>
        </div>

        <div className="kpi-card highlight-green">
          <div className="kpi-top">
            <span className="kpi-title">Overall Completion Rate</span>
            <span className="kpi-badge badge-completed">Compliance</span>
          </div>
          <div className="kpi-body">
            <strong className="kpi-value">{quality?.completion_rate ?? 0}%</strong>
            <span className="kpi-subtext">Permits closed out & audited</span>
          </div>
          <div className="kpi-footer">
            <span>Avg Days to Close: <strong>{quality?.avg_days_to_close ? `${quality.avg_days_to_close} days` : 'N/A'}</strong></span>
          </div>
        </div>

        <div className="kpi-card highlight-purple">
          <div className="kpi-top">
            <span className="kpi-title">Equipment Fit Rate</span>
            <span className="kpi-badge badge-ok">Handover Quality</span>
          </div>
          <div className="kpi-body">
            <strong className="kpi-value">{quality?.fit ?? 0}</strong>
            <span className="kpi-subtext">Verified fit for clinical use</span>
          </div>
          <div className="kpi-footer">
            <span>Not Fit: <strong className="bad-text">{quality?.not_fit ?? 0}</strong> | Pending: <strong>{quality?.pending_fit ?? 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="view-mode-tabs">
        <button
          type="button"
          className={`tab-btn ${activeView === 'flow' ? 'active' : ''}`}
          onClick={() => setActiveView('flow')}
        >
          <svg viewBox="0 0 24 24"><path d="M3 3v18h18M18 17V9M13 17V5M8 17v-3" /></svg>
          <span>Monthly Operations Flow</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeView === 'status' ? 'active' : ''}`}
          onClick={() => setActiveView('status')}
        >
          <svg viewBox="0 0 24 24"><path d="M12 20V10M18 20V4M6 20v-6" /></svg>
          <span>Status Evolution</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeView === 'location' ? 'active' : ''}`}
          onClick={() => setActiveView('location')}
        >
          <svg viewBox="0 0 24 24"><path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 1a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" /></svg>
          <span>Site Location Comparison</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${activeView === 'nature' ? 'active' : ''}`}
          onClick={() => setActiveView('nature')}
        >
          <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
          <span>Nature of Work</span>
        </button>
      </div>

      {/* Primary Clustered Bar Graph + Trend Line Container */}
      <section className="primary-chart-section">
        {activeView === 'flow' && (
          <ClusterBarTrendChart
            title="Monthly Permit Operations Flow & Cumulative Closure Trend"
            subtitle="Side-by-side clustered breakdown of permits Opened, Activated, and Closed per month, overlaid with cumulative closed volume."
            categories={flowCategories}
            barSeries={flowBarSeries}
            trendLine={flowTrendLine}
            height={360}
          />
        )}
        {activeView === 'status' && (
          <ClusterBarTrendChart
            title="Historical Status Evolution & Monthly Closed Volume"
            subtitle="Clustered breakdown of permit statuses across months overlaid with closed volume."
            categories={statusCategories}
            barSeries={statusBarSeries}
            trendLine={statusTrendLine}
            height={360}
          />
        )}
        {activeView === 'location' && (
          <ClusterBarTrendChart
            title="Site Location Comparison & Total Volume Trend"
            subtitle="Comparative cluster breakdown across Darth Valley Hospital vs Queen Mary's Hospital."
            categories={locationCategories}
            barSeries={locationBarSeries}
            trendLine={locationTrendLine}
            height={360}
          />
        )}
        {activeView === 'nature' && (
          <ClusterBarTrendChart
            title="Nature of Work Distribution & Total Scope"
            subtitle="Comparing Repair, Maintenance, and Service workload pipelines."
            categories={natureCategories}
            barSeries={natureBarSeries}
            trendLine={natureTrendLine}
            height={360}
          />
        )}
      </section>

      {/* Secondary Detailed Breakdown Grid */}
      <div className="secondary-breakdown-grid">
        {/* Real-time Workspace Stage Distribution */}
        <section className="table-card breakdown-card">
          <div className="card-head-bar">
            <h3>Current Stage Distribution</h3>
            <span className="muted-tag">{counts.total || 0} Total Permits</span>
          </div>
          <div className="stage-meters">
            {[
              ['Draft', counts.draft ?? 0, '#98a2b3'],
              ['With Engineer (Active)', counts.active ?? 0, '#1677ff'],
              ['User Review Pending', counts.pending_user ?? 0, '#f59e0b'],
              ['AP(D) Audit Review', counts.pending_review ?? 0, '#dc6803'],
              ['Completed & Closed', counts.completed ?? 0, '#12b76a'],
            ].map(([label, value, color]) => {
              const pct = Math.round((Number(value) / totalPermits) * 100)
              return (
                <div className="meter" key={String(label)}>
                  <div className="meter-head">
                    <div className="meter-label">
                      <span className="dot-indicator" style={{ backgroundColor: String(color) }} />
                      <span>{label}</span>
                    </div>
                    <div className="meter-val-wrap">
                      <strong>{value}</strong>
                      <small className="muted">({pct}%)</small>
                    </div>
                  </div>
                  <div className="meter-track">
                    <span style={{ width: `${pct}%`, backgroundColor: String(color) }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Equipment Quality & Handover Audit Card */}
        <section className="table-card breakdown-card">
          <div className="card-head-bar">
            <h3>Handover & Quality Audit</h3>
            <span className="muted-tag">Safety Verification</span>
          </div>
          <div className="quality-audit-body">
            <div className="quality-stat-row">
              <div className="q-item ok">
                <span className="q-label">Fit for Clinical Use</span>
                <strong className="q-val">{quality?.fit ?? 0}</strong>
              </div>
              <div className="q-item bad">
                <span className="q-label">Not Fit (Defect Found)</span>
                <strong className="q-val">{quality?.not_fit ?? 0}</strong>
              </div>
              <div className="q-item info">
                <span className="q-label">Pending Handover</span>
                <strong className="q-val">{quality?.pending_fit ?? 0}</strong>
              </div>
            </div>

            <div className="audit-summary-box">
              <div className="summary-line">
                <span>Average Days to Close Out:</span>
                <strong>{quality?.avg_days_to_close ? `${quality.avg_days_to_close} Days` : 'N/A'}</strong>
              </div>
              <div className="summary-line">
                <span>All-Time Created Records:</span>
                <strong>{history?.all_time_created ?? 0}</strong>
              </div>
              <div className="summary-line">
                <span>All-Time Closed Records:</span>
                <strong>{history?.all_time_completed ?? 0}</strong>
              </div>
              {history?.oldest_permit && (
                <div className="summary-line">
                  <span>Earliest Record Date:</span>
                  <strong className="mono">{new Date(history.oldest_permit).toLocaleDateString()}</strong>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
