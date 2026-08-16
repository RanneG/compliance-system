import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import SignaturePad from '../components/SignaturePad'
import ProgressStrip from '../components/ProgressStrip'
import { managerName, NATURE_LABEL, SITES } from '../lib/format'
import type { NatureOfWork, SiteLocation } from '../types'

export default function NewPermit() {
  const navigate = useNavigate()
  const [site, setSite] = useState<SiteLocation>(SITES[0])
  const [equipmentName, setEquipmentName] = useState('')
  const [equipment, setEquipment] = useState('')
  const [nature, setNature] = useState<NatureOfWork>('repair')
  const [description, setDescription] = useState('')
  const [clean, setClean] = useState(false)
  const [signature, setSignature] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  async function submit(issue: boolean) {
    if (!clean) {
      setError('Confirm the equipment has been decontaminated before issuing a permit.')
      return
    }
    if (issue && !signature) {
      setError('Part 1 needs the User signature before the engineer can be called.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const permit = await api.createPermit({
        equipment_sn: equipment,
        equipment_name: equipmentName,
        location: site,
        nature_of_work: nature,
        description,
        decontaminated: clean,
        signature_png: signature || undefined,
        created_by: managerName(),
      })
      if (issue) {
        await api.activate(permit.id, managerName())
        navigate(`/permits/${permit.id}`, { state: { share: true } })
        return
      }
      navigate(`/permits/${permit.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create permit.')
    } finally {
      setBusy(false)
    }
  }

  async function startScan() {
    setScanOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      const Detector = (
        window as Window & {
          BarcodeDetector?: new (opts: { formats: string[] }) => {
            detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
          }
        }
      ).BarcodeDetector
      if (!Detector) return
      const detector = new Detector({ formats: ['code_128', 'code_39', 'ean_13', 'qr_code'] })
      const tick = async () => {
        if (!videoRef.current) return
        const codes = await detector.detect(videoRef.current)
        if (codes[0]?.rawValue) {
          setEquipment(codes[0].rawValue)
          stopScan()
          return
        }
        requestAnimationFrame(() => {
          void tick()
        })
      }
      void tick()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Camera unavailable.')
    }
  }

  function stopScan() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setScanOpen(false)
  }

  return (
    <div className="grid-2">
      <form
        className="paper form"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(true)
        }}
      >
        <p className="kicker">QA-ADM01 · Part 1</p>
        <h2>Pre-work checks</h2>
        <ProgressStrip status="draft" />
        <label>
          Hospital
          <select value={site} onChange={(event) => setSite(event.target.value as SiteLocation)}>
            {SITES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Decontamination equipment
          <input
            required
            value={equipmentName}
            onChange={(event) => setEquipmentName(event.target.value)}
            placeholder="e.g. Washer-disinfector 2"
          />
        </label>
        <label>
          Equipment serial number
          <div className="inline-scan">
            <input
              required
              value={equipment}
              onChange={(event) => setEquipment(event.target.value)}
              placeholder="Scan or enter SN"
            />
            <button type="button" className="ghost" onClick={() => void startScan()}>
              Scan
            </button>
          </div>
        </label>
        <label>
          Nature of work
          <select value={nature} onChange={(event) => setNature(event.target.value as NatureOfWork)}>
            {(Object.keys(NATURE_LABEL) as NatureOfWork[]).map((key) => (
              <option key={key} value={key}>
                {NATURE_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scope notes
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional: isolation, cycle fault, planned service"
          />
        </label>
        <label className="check">
          <input type="checkbox" checked={clean} onChange={(event) => setClean(event.target.checked)} />
          I confirm this equipment has been decontaminated and cleaned so it is safe for maintenance or
          repair.
        </label>
        <SignaturePad value={signature} onChange={setSignature} label="User signature" />
        {error && <p className="error">{error}</p>}
        <div className="action-row">
          <button type="submit" className="btn" disabled={busy}>
            Authorise and share with engineer
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={() => void submit(false)}>
            Save draft only
          </button>
        </div>
      </form>
      <aside className="help-card">
        <h3>How this permit runs</h3>
        <ol>
          <li>User completes Part 1 and shares the QR with the attending CP(D).</li>
          <li>Engineer signs the EDU declaration, then records the work and fit/not-fit.</li>
          <li>User verifies the hand-back. AP(D) reviews and closes the record to the vault.</li>
        </ol>
        <p className="muted">Each machine needs its own PTW. Numbers follow DVH01 / QMH01.</p>
      </aside>
      {scanOpen && (
        <div className="modal-backdrop" onClick={stopScan}>
          <div className="modal paper" onClick={(event) => event.stopPropagation()}>
            <p className="kicker">Barcode scan</p>
            <h2>Point the camera at the nameplate</h2>
            <video ref={videoRef} className="scan-video" muted playsInline />
            <button type="button" className="ghost" onClick={stopScan}>
              Close camera
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
