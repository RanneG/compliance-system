import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import LegalLinks from '../components/LegalLinks'
import ProgressStrip from '../components/ProgressStrip'
import SignaturePad from '../components/SignaturePad'
import StatusBadge from '../components/StatusBadge'
import { formatStamp, NATURE_LABEL } from '../lib/format'
import type { Permit } from '../types'

type Tab = 'permit' | 'declare' | 'handover'

export default function Contractor() {
  const { token = '' } = useParams()
  const [permit, setPermit] = useState<Permit | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('permit')
  const [name, setName] = useState('')
  const [ack, setAck] = useState(false)
  const [declarationSig, setDeclarationSig] = useState('')
  const [details, setDetails] = useState('')
  const [fit, setFit] = useState(true)
  const [notFit, setNotFit] = useState('')
  const [handoverSig, setHandoverSig] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const next = await api.access(token)
      setPermit(next)
      setName(next.contractor_name || '')
      setDetails(next.work_details || '')
      setNotFit(next.not_fit_reason || '')
      if (next.fit_for_purpose != null) setFit(next.fit_for_purpose)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Access denied.')
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  const declared = Boolean(permit?.signatures.some((sig) => sig.part === 'declaration'))
  const submitted = permit?.status === 'pending_user' || permit?.status === 'pending_review' || permit?.status === 'completed'

  useEffect(() => {
    if (!permit) return
    if (submitted) setTab('handover')
    else if (declared) setTab('handover')
  }, [permit, declared, submitted])

  async function signDeclaration() {
    setBusy(true)
    setError('')
    try {
      setPermit(await api.declare(token, { signer_name: name, signature_png: declarationSig, acknowledged: ack }))
      setTab('handover')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign declaration.')
    } finally {
      setBusy(false)
    }
  }

  async function submitHandover() {
    setBusy(true)
    setError('')
    try {
      setPermit(
        await api.handover(token, {
          work_details: details,
          fit_for_purpose: fit,
          signer_name: name,
          signature_png: handoverSig,
          not_fit_reason: fit ? '' : notFit,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handover failed.')
    } finally {
      setBusy(false)
    }
  }

  if (error && !permit) {
    return (
      <div className="field-app">
        <div className="paper field-card">
          <h1>Access not valid</h1>
          <p>{error}</p>
          <LegalLinks />
        </div>
      </div>
    )
  }
  if (!permit) {
    return (
      <div className="field-app">
        <p className="muted">Opening permit…</p>
      </div>
    )
  }

  return (
    <div className="field-app">
      <header className="field-top">
        <div>
          <p className="kicker">CP(D) / engineer</p>
          <h1>{permit.id}</h1>
        </div>
        <StatusBadge status={permit.status} />
      </header>
      <ProgressStrip status={permit.status} declared={declared} />
      <main className="field-main">
        {error && <p className="error">{error}</p>}
        {tab === 'permit' && (
          <section className="paper field-card">
            <p className="kicker">Review before you start</p>
            <h2>{permit.equipment_name || permit.equipment_sn}</h2>
            <p className="mono">{permit.equipment_sn}</p>
            <p>{permit.location}</p>
            <p>{NATURE_LABEL[permit.nature_of_work]}</p>
            {permit.description && <p className="scope">{permit.description}</p>}
            <p className="muted">Issued {formatStamp(permit.activated_at || permit.created_at)}</p>
            <button type="button" className="btn" onClick={() => setTab('declare')}>
              Continue to Part 2
            </button>
          </section>
        )}
        {tab === 'declare' && (
          <section className="paper field-card">
            <p className="kicker">Part 2 · CP(D) declaration</p>
            <h2>Endoscopy Decontamination Unit</h2>
            {declared ? (
              <p className="ok">Declaration already signed. Continue to hand-back.</p>
            ) : (
              <>
                <p>
                  I understand the special environment conditions within the Endoscopy Decontamination
                  Unit and that I must wear suitable PPE. I confirm I am trained and competent for this
                  work and have supplied the relevant competency certificate.
                </p>
                <label className="check">
                  <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} />
                  I accept this declaration and agree to proceed.
                </label>
                <label>
                  CP(D) name
                  <input value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <SignaturePad value={declarationSig} onChange={setDeclarationSig} />
                <button type="button" className="btn" disabled={busy} onClick={() => void signDeclaration()}>
                  Sign Part 2
                </button>
              </>
            )}
          </section>
        )}
        {tab === 'handover' && (
          <section className="paper field-card">
            <p className="kicker">Part 3 · Hand-back</p>
            <h2>Details of work carried out</h2>
            {submitted ? (
              <p className="ok">Hand-back submitted. The User will complete Part 4.</p>
            ) : (
              <>
                <label>
                  Work record
                  <textarea rows={5} value={details} onChange={(event) => setDetails(event.target.value)} />
                </label>
                <div className="toggle">
                  <button type="button" className={fit ? 'on' : ''} onClick={() => setFit(true)}>
                    Fit for use
                  </button>
                  <button type="button" className={!fit ? 'on danger' : ''} onClick={() => setFit(false)}>
                    Not fit for use
                  </button>
                </div>
                {!fit && (
                  <label>
                    Reason and action plan
                    <textarea rows={3} value={notFit} onChange={(event) => setNotFit(event.target.value)} />
                  </label>
                )}
                <label>
                  CP(D) name
                  <input value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <SignaturePad value={handoverSig} onChange={setHandoverSig} label="Hand-back signature" />
                <button type="button" className="btn" disabled={busy || !declared} onClick={() => void submitHandover()}>
                  Submit Part 3
                </button>
              </>
            )}
          </section>
        )}
      </main>
      <footer className="legal-bar field-legal">
        <LegalLinks />
      </footer>
      <nav className="field-nav">
        <button type="button" className={tab === 'permit' ? 'on' : ''} onClick={() => setTab('permit')}>
          Permit
        </button>
        <button type="button" className={tab === 'declare' ? 'on' : ''} onClick={() => setTab('declare')}>
          Part 2
        </button>
        <button
          type="button"
          className={tab === 'handover' ? 'on' : ''}
          onClick={() => setTab('handover')}
          disabled={!declared && !submitted}
        >
          Part 3
        </button>
      </nav>
    </div>
  )
}
