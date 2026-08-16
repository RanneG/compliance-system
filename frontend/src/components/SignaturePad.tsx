import { useEffect, useRef, type PointerEvent } from 'react'

type Props = {
  value: string
  onChange: (dataUrl: string) => void
  label?: string
}

export default function SignaturePad({ value, onChange, label = 'Tap to sign' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const snapshot = canvas.toDataURL()
      canvas.width = Math.floor(rect.width * ratio)
      canvas.height = Math.floor(rect.height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(ratio, ratio)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1b1914'
      ctx.lineWidth = 2.2
      if (value) {
        const image = new Image()
        image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height)
        image.src = snapshot.startsWith('data:image') && snapshot.length > 100 ? snapshot : value
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    drawing.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = point(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = point(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function end() {
    drawing.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div className="sign-wrap">
      <div className="sign-head">
        <span>{label}</span>
        <button type="button" className="text-btn" onClick={clear}>
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="sign-pad"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
    </div>
  )
}
