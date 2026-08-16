import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { clearSession, getSession } from '../auth'
import { initials } from '../lib/format'

export default function Layout() {
  const navigate = useNavigate()
  const name = getSession()?.name || 'Admin'
  const [query, setQuery] = useState('')
  const [briefing, setBriefing] = useState(false)

  function search(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            ICS
          </span>
          <div>
            <strong>Industrial Safety</strong>
            <small>Operational Control</small>
          </div>
        </div>
        <nav className="side-nav">
          <NavLink to="/" end>
            <IconList />
            Permit List
          </NavLink>
          <NavLink to="/tasks">
            <IconTasks />
            My Tasks
          </NavLink>
          <NavLink to="/vault">
            <IconArchive />
            Audit Vault
          </NavLink>
          <NavLink to="/analytics">
            <IconChart />
            Analytics
          </NavLink>
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="btn briefing" onClick={() => setBriefing(true)}>
            Safety Briefing
          </button>
          <button type="button" className="quiet-link" onClick={() => setBriefing(true)}>
            Help Center
          </button>
          <button
            type="button"
            className="quiet-link"
            onClick={() => {
              void api.logout()
              clearSession()
              navigate('/login')
            }}
          >
            Log out
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <form className="top-search" onSubmit={search}>
            <IconSearch />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search permits..."
              aria-label="Search permits"
            />
          </form>
          <nav className="top-links">
            <NavLink to="/" end>
              Dashboard
            </NavLink>
          </nav>
          <button type="button" className="btn" onClick={() => navigate('/permits/new')}>
            + New Permit
          </button>
          <div className="top-utils">
            <span className="icon-btn" title="Notifications" aria-label="Notifications">
              <IconBell />
            </span>
            <span className="icon-btn" title="Settings" aria-label="Settings">
              <IconGear />
            </span>
            <span className="avatar" title={name}>
              {initials(name)}
            </span>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
      {briefing && (
        <div className="modal-backdrop" onClick={() => setBriefing(false)}>
          <div className="modal paper" onClick={(event) => event.stopPropagation()}>
            <p className="kicker">Site control</p>
            <h2>Safety briefing</h2>
            <p>
              Isolate energy sources, confirm gas-free status, and wear task-specific PPE before
              any permit is signed in the field.
            </p>
            <ol className="brief-list">
              <li>Verify equipment serial number against the nameplate.</li>
              <li>Share access only with the contractor on site.</li>
              <li>Do not vault a record until evidence and hand-back are complete.</li>
            </ol>
            <button type="button" className="btn" onClick={() => setBriefing(false)}>
              Acknowledged
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}
function IconTasks() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
function IconArchive() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h18v13H3zM3 7l2-4h14l2 4" />
    </svg>
  )
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}
function IconBell() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  )
}
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H8a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V8c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
