export const LAST_UPDATED = '16 August 2026'

export type LegalSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type LegalDoc = {
  title: string
  intro: string
  sections: LegalSection[]
}

export const TERMS: LegalDoc = {
  title: 'Terms of Service',
  intro:
    'These terms govern use of the Industrial Compliance System (ICS), a Permit to Work application for endoscopy decontamination and related equipment work. By signing in, opening a permit link, or submitting a signature, you agree to them.',
  sections: [
    {
      heading: '1. Who operates this instance',
      paragraphs: [
        'ICS is software. Each deployment is operated by the organisation that installed or hosted it (the “operator”). These pages describe this software as shipped. The operator is responsible for how they run it, who they invite, and how they keep records.',
      ],
    },
    {
      heading: '2. Demo and evaluation use',
      paragraphs: [
        'This copy may be a demonstration. The manager sign-in shipped with the project is a known demo credential (john ferrer). Do not put real patient data, live production secrets, or regulated records into a demo instance unless the operator has hardened authentication, backups, and access control.',
        'A public tunnel or temporary URL is for short evaluation only. It is not a guaranteed hosting service.',
      ],
    },
    {
      heading: '3. Accounts and field access',
      paragraphs: [
        'Managers sign in with credentials issued by the operator. Engineers and contractors do not create accounts. They use a unique permit URL or QR code issued for that job.',
        'Anyone who has the permit link can view that permit and submit the contractor parts of the workflow. Treat links as credentials. Do not post them publicly or reuse them for unrelated work.',
      ],
    },
    {
      heading: '4. What you must not do',
      paragraphs: [
        'You must not use ICS to break the law, impersonate another person, interfere with other users, attempt to access permits you were not given, or upload malware. You must not rely on a demo instance as the sole legal archive of a permit if the operator has not confirmed retention and backup.',
      ],
    },
    {
      heading: '5. Records, signatures, and evidence',
      paragraphs: [
        'Names, drawn signatures, work records, fit-for-purpose statements, and uploaded files become part of the permit audit trail. Submitting them is your confirmation that the information is accurate to the best of your knowledge and that you are authorised to sign.',
        'ICS helps digitise a Permit to Work process. It does not replace site rules, competency requirements, or the operator’s legal duties.',
      ],
    },
    {
      heading: '6. Availability',
      paragraphs: [
        'The software is provided as-is. Local, Docker, and temporary tunnel deployments can stop when the host machine stops. The operator does not guarantee uninterrupted access unless they have contracted otherwise.',
      ],
    },
    {
      heading: '7. Liability',
      paragraphs: [
        'To the extent permitted by law, the software authors are not liable for loss arising from demo use, misconfiguration, lost links, or failure to keep backups. Nothing in these terms excludes liability that cannot be excluded under applicable law.',
      ],
    },
    {
      heading: '8. Changes',
      paragraphs: [
        'These terms live in the product. When ICS changes how access, data, or third-party services work, the terms must be updated and the “Last updated” date changed. Continued use after an update means you accept the revised terms.',
      ],
    },
    {
      heading: '9. Contact',
      paragraphs: [
        'Questions about a live instance go to the operator (the authorised person or IT team that deployed it). The public project is at https://github.com/RanneG/compliance-system.',
      ],
    },
  ],
}

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  intro:
    'This policy explains what ICS stores, why, and which third parties a browser may contact. It reflects the software as of the date below. The operator of each instance is the controller for personal data processed on that instance.',
  sections: [
    {
      heading: '1. Who this applies to',
      paragraphs: [
        'Managers and authorised persons who sign in, and engineers or contractors (CP(D) and similar roles) who open a permit link and sign or upload evidence.',
      ],
    },
    {
      heading: '2. What we collect',
      paragraphs: ['ICS stores the following when you use it:'],
      bullets: [
        'Permit details: location (hospital), equipment name and serial number, nature of work, descriptions, and status.',
        'Identity and role text you enter (for example manager name, CP(D) name).',
        'Drawn signature images (PNG) and the time they were captured.',
        'Work records, fit / not-fit statements, and reasons.',
        'Evidence files you upload (JPEG, PNG, or PDF, up to 10 MB).',
        'An append-only audit trail, including event type, actor name, timestamp (UTC), and browser user-agent.',
        'A manager session token in the browser (sessionStorage). Optionally a display name in localStorage.',
        'The demo manager username shipped with the project (john ferrer).',
      ],
    },
    {
      heading: '3. What we do not collect',
      paragraphs: [
        'ICS does not include advertising SDKs, product-analytics SaaS, payment processors, or social logins. There is no mailing list. The in-app Analytics screen summarises permits already in the local database; it does not send data to a third-party analytics company.',
      ],
    },
    {
      heading: '4. Why we use this data',
      paragraphs: [
        'To run the Permit to Work workflow (create, share, declare, hand back, review, and vault), to show a dashboard and audit history, and to keep a record of who signed which part. Legal bases for an operator in the UK/EEA typically include legitimate interests in site safety and, where relevant, performance of a contract or legal obligation. The operator must confirm the basis that applies to them.',
      ],
    },
    {
      heading: '5. Where data is stored',
      paragraphs: [
        'By default, records sit on the machine or container that runs ICS: a SQLite file and an uploads folder. Data is not sent to a vendor database as part of the core app. If the operator hosts ICS on Render, Docker, a tunnel, or another host, that host’s infrastructure also processes the same records while the instance is running.',
        'Manager sign-in is an in-memory session on the server plus a token in the browser. Closing the browser tab clears sessionStorage; the server session is not a long-lived cookie.',
      ],
    },
    {
      heading: '6. Third-party software and services',
      paragraphs: [
        'The product UI loads the Inter font from Google Fonts (fonts.googleapis.com and fonts.gstatic.com). Your browser may send your IP address and user-agent to Google to fetch the font. See Google’s own privacy documentation for that request.',
        'Libraries shipped with the app (not contacted at runtime as a cloud service) include FastAPI, Uvicorn, Python-Multipart, qrcode, Pillow, React, React DOM, and React Router, plus their transitive open-source dependencies. Build and test tools include Vite, TypeScript, and pytest.',
        'Optional evaluation hosting may use Cloudflare Tunnel (trycloudflare.com), GitHub (source and Actions), GitHub Container Registry, or a Render blueprint. Those providers process connection data under their own terms while you use them.',
      ],
    },
    {
      heading: '7. Cookies',
      paragraphs: [
        'ICS does not set tracking cookies. It uses sessionStorage for the manager session and may use localStorage for a display name. Permit access for contractors is the token in the URL, not a cookie.',
      ],
    },
    {
      heading: '8. Sharing',
      paragraphs: [
        'Permit data is visible to signed-in managers on that instance and to anyone who has the contractor link for that permit. ICS does not sell personal data. The operator may disclose records if required by law or by their own site policy.',
      ],
    },
    {
      heading: '9. Retention',
      paragraphs: [
        'Records remain until the operator deletes the database, uploads, or the host. Vaulted permits are intended as an audit archive. There is no automatic erasure job in this version.',
      ],
    },
    {
      heading: '10. Your rights',
      paragraphs: [
        'Depending on applicable law (including UK GDPR), you may have rights to access, correct, delete, or restrict personal data, and to complain to a supervisory authority (in the UK, the ICO). Exercise these with the operator of the instance, not by emailing a generic inbox inside this demo.',
      ],
    },
    {
      heading: '11. Children',
      paragraphs: [
        'ICS is for workplace Permit to Work. It is not directed at children.',
      ],
    },
    {
      heading: '12. Changes',
      paragraphs: [
        'When the app starts collecting new personal data, adding cookies or trackers, calling a new third-party service, or changing where records are stored, this policy and the Last updated date must be revised in the same change.',
      ],
    },
    {
      heading: '13. Contact',
      paragraphs: [
        'For a deployed instance, contact the operator. Project source: https://github.com/RanneG/compliance-system.',
      ],
    },
  ],
}
