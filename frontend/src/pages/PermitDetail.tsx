import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { api } from '../api'
import ProgressStrip from '../components/ProgressStrip'
import ShareModal from '../components/ShareModal'
import SignaturePad from '../components/SignaturePad'
import StatusBadge from '../components/StatusBadge'
import { eventLabel, formatStamp, managerName, NATURE_LABEL } from '../lib/format'
import type { Permit } from '../types'

export default function PermitDetail() {
  const { id = '' } = useParams()
  const location = useLocation()
  const [permit, setPermit] = useState<Permit | null>(null)
  const [error, setError] = useState('')
  const [share, setShare] = useState(Boolean((location.state as { share?: boolean } | null)?.share))
  const [signature, setSignature] = useState('')
  const [acceptFit, setAcceptFit] = useState(true)
  const [notFit, setNotFit] = useState('')
  const [showAllTrail, setShowAllTrail] = useState(false)

  async function load() {
    try {
      setPermit(await api.permit(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permit not found.')
    }
  }

  useEffect(() => {
    void load()
  }, [id])

  if (error) return <p className="error">{error}</p>
  if (!permit) return <p className="muted">Loading permit…</p>

  const readOnly = permit.status === 'completed'
  const declared = permit.signatures.some((sig) => sig.part === 'declaration')

  async function issue() {
    if (!permit) return
    const next = await api.activate(permit.id, managerName())
    setPermit(next)
    setShare(true)
  }

  async function userReview() {
    if (!permit) return
    const next = await api.userReview(permit.id, {
      actor: managerName(),
      accepted_fit: acceptFit,
      signature_png: signature,
      not_fit_details: acceptFit ? '' : notFit,
    })
    setPermit(next)
    setSignature('')
  }

  async function lockVault() {
    if (!permit) return
    const next = await api.audit(permit.id, managerName(), signature || undefined)
    setPermit(next)
  }

  return (
    <div className="detail">
      <div className="page-head">
        <div>
          <p className="kicker">{permit.location}</p>
          <h2>{permit.id}</h2>
        </div>
        <StatusBadge status={permit.status} />
      </div>
      <ProgressStrip status={permit.status} declared={declared} />
      <div className="grid-2">
        <section className="paper">
          <p className="kicker">Part 1 · User</p>
          <dl className="meta-grid">
            <div>
              <dt>Equipment</dt>
              <dd>{permit.equipment_name || '—'}</dd>
            </div>
            <div>
              <dt>Serial number</dt>
              <dd className="mono">{permit.equipment_sn}</dd>
            </div>
            <div>
              <dt>Nature of work</dt>
              <dd>{NATURE_LABEL[permit.nature_of_work]}</dd>
            </div>
            <div>
              <dt>User</dt>
              <dd>{permit.created_by}</dd>
            </div>
          </dl>
          {permit.decontaminated && <p className="ok">Decontaminated and safe for maintenance.</p>}
          {permit.description && <p className="scope">{permit.description}</p>}
          {!readOnly && (permit.status === 'draft' || permit.status === 'active') && (
            <div className="action-row">
              <button type="button" className="btn" onClick={() => void issue()}>
                {permit.access_token ? 'Open engineer QR' : 'Share with engineer'}
              </button>
              {permit.access_token && (
                <button type="button" className="ghost" onClick={() => setShare(true)}>
                  Copy / print
                </button>
              )}
            </div>
          )}
        </section>
        <section className="paper">
          <p className="kicker">Parts 2–3 · Engineer</p>
          <h3>{permit.contractor_name || 'Waiting for CP(D)'}</h3>
          {permit.work_details && <p>{permit.work_details}</p>}
          {permit.fit_for_purpose != null && (
            <p className={permit.fit_for_purpose ? 'ok' : 'bad'}>
              {permit.fit_for_purpose ? 'Fit for use' : 'Not fit for use'}
            </p>
          )}
          {permit.not_fit_reason && <p>{permit.not_fit_reason}</p>}
          {permit.signatures.map((sig) => (
            <figure key={sig.id} className="sig-card">
              <figcaption>
                {sig.part} · {sig.signer_name} · {formatStamp(sig.signed_at)}
              </figcaption>
              <img src={sig.image_png} alt={`${sig.part} signature`} />
            </figure>
          ))}
        </section>
      </div>
      {permit.status === 'pending_user' && (
        <section className="paper audit-box">
          <p className="kicker">Part 4 · User verification</p>
          <h3>Accept the hand-back</h3>
          <p>Review the work record, then confirm whether the equipment is fit for use.</p>
          <div className="toggle">
            <button type="button" className={acceptFit ? 'on' : ''} onClick={() => setAcceptFit(true)}>
              Fit for use
            </button>
            <button type="button" className={!acceptFit ? 'on danger' : ''} onClick={() => setAcceptFit(false)}>
              Not fit for use
            </button>
          </div>
          {!acceptFit && (
            <label>
              Details if not fit
              <textarea rows={3} value={notFit} onChange={(event) => setNotFit(event.target.value)} />
            </label>
          )}
          <SignaturePad value={signature} onChange={setSignature} label="User signature" />
          <button type="button" className="btn" onClick={() => void userReview()}>
            Sign Part 4
          </button>
        </section>
      )}
      {permit.status === 'pending_review' && (
        <section className="paper audit-box">
          <p className="kicker">Part 5 · AP(D) review</p>
          <h3>Close this permit</h3>
          <p>
            User accepted: {permit.user_fit ? 'fit for use' : 'not fit for use'}. Signing locks the
            record in the audit vault for at least two years.
          </p>
          {permit.user_not_fit_details && <p>{permit.user_not_fit_details}</p>}
          <SignaturePad value={signature} onChange={setSignature} label="AP(D) signature" />
          <button type="button" className="btn" onClick={() => void lockVault()}>
            Sign Part 5 and vault
          </button>
        </section>
      )}
      <section className="trail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <h3 style={{ margin: 0 }}>Controlled record</h3>
          {(permit.audit_trail || []).length > 5 && (
            <button
              type="button"
              className="text-btn"
              onClick={() => setShowAllTrail(!showAllTrail)}
              style={{ fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {showAllTrail ? 'Show 5 most recent' : `Show all ${(permit.audit_trail || []).length} records`}
            </button>
          )}
        </div>
        <ol>
          {(showAllTrail ? (permit.audit_trail || []) : (permit.audit_trail || []).slice(-5)).map((event) => (
            <li key={event.id}>
              <strong>{eventLabel(event.event_type)}</strong>
              <span>
                {event.actor} · {formatStamp(event.created_at)}
              </span>
            </li>
          ))}
        </ol>
        {readOnly && (
          <p className="muted">
            Vaulted. Search from the <Link to="/vault">audit vault</Link>.
          </p>
        )}
      </section>
      {share && permit.access_token && <ShareModal permit={permit} onClose={() => setShare(false)} />}
    </div>
  )
}
