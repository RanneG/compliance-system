import { Link } from 'react-router-dom'

export default function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav className={`legal-links ${className}`.trim()} aria-label="Legal">
      <Link to="/terms">Terms of Service</Link>
      <Link to="/privacy">Privacy Policy</Link>
    </nav>
  )
}
