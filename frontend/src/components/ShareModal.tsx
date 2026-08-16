import { api, copyText } from '../api'
import type { Permit } from '../types'

type Props = {
  permit: Permit
  onClose: () => void
}

export default function ShareModal({ permit, onClose }: Props) {
  const url = `${window.location.origin}/p/${permit.access_token}`
  const qr = api.qrUrl(permit.id)

  function emailAccess() {
    const subject = encodeURIComponent(`PTW access · ${permit.id}`)
    const body = encodeURIComponent(
      `You have been issued field access for ${permit.id} (${permit.equipment_sn} at ${permit.location}).\n\nOpen this secure link on site:\n${url}\n`,
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  function printQr() {
    const popup = window.open('', '_blank', 'width=520,height=720')
    if (!popup) return
    popup.document.write(`
      <html>
        <head>
          <title>${permit.id} field access</title>
          <style>
            body { font-family: Georgia, serif; padding: 48px; text-align: center; color: #1b1914; }
            img { width: 280px; height: 280px; }
            h1 { font-size: 18px; letter-spacing: 0.2em; text-transform: uppercase; }
            p { color: #5c564c; }
          </style>
        </head>
        <body>
          <h1>Permit to Work</h1>
          <p>${permit.id}</p>
          <img src="${qr}" alt="QR access" />
          <p>${permit.equipment_sn}<br/>${permit.location}</p>
          <p>${url}</p>
          <script>window.onload = () => window.print()</script>
        </body>
      </html>
    `)
    popup.document.close()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal paper" onClick={(event) => event.stopPropagation()}>
        <p className="kicker">Share field access</p>
        <h2>{permit.id}</h2>
        <p className="lede">
          Unique tokenized URL for the contractor on site. Anyone with this link can sign the
          declaration and submit hand-back.
        </p>
        <img className="qr" src={qr} alt={`QR code for ${permit.id}`} />
        <code className="share-url">{url}</code>
        <div className="action-row">
          <button type="button" className="btn" onClick={() => copyText(url)}>
            Copy link
          </button>
          <button type="button" className="ghost" onClick={emailAccess}>
            Email access
          </button>
          <button type="button" className="ghost" onClick={printQr}>
            Print QR
          </button>
        </div>
        <button type="button" className="text-btn close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
