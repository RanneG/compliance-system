import { Link } from 'react-router-dom'
import LegalLinks from '../components/LegalLinks'
import { LAST_UPDATED, PRIVACY, TERMS, type LegalDoc } from '../legal/content'

export default function Legal({ kind }: { kind: 'terms' | 'privacy' }) {
  const doc: LegalDoc = kind === 'terms' ? TERMS : PRIVACY
  return (
    <div className="legal-shell">
      <header className="legal-head">
        <Link to="/login" className="brand legal-brand">
          <span className="mark">ICS</span>
          <div>
            <strong>Industrial Safety</strong>
            <small>Operational Control</small>
          </div>
        </Link>
        <LegalLinks />
      </header>
      <article className="paper legal-doc">
        <p className="kicker">Industrial Compliance System</p>
        <h1>{doc.title}</h1>
        <p className="muted">Last updated {LAST_UPDATED}</p>
        <p className="lede">{doc.intro}</p>
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </div>
  )
}
