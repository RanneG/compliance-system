# Product Requirements Document — PTW Compliance Platform

## 1. Project overview

The PTW Compliance Platform (product name: **Industrial Compliance System**) digitizes and automates the Permit to Work lifecycle. It replaces paper permits with a controlled digital workflow for equipment decontamination, repair, and maintenance.

## 2. Target users

- **Managers / authorized persons** — office users who initiate permits, issue access credentials, and perform final audit.
- **Engineers / contractors** — field users who open a tokenized QR or link, sign the safety declaration, execute work, and submit evidence.

## 3. Core workflow

1. **Initiation** — manager creates a draft with equipment serial number, location, and nature of work.
2. **Access sharing** — system issues a unique QR code and URL.
3. **Field execution** — contractor opens the link, signs the declaration, and performs the work.
4. **Hand-back** — contractor submits work details, fit-for-purpose status, photo/PDF evidence, and a timestamped signature.
5. **Review and audit** — manager reviews the pack and locks the record in the audit vault.

## 4. Functional requirements

Covered in this repository:

- Manager desktop: initiation form (including barcode scan where the browser supports it), share pack (copy / email / print QR), live dashboard, searchable vault.
- Contractor mobile: no login; tokenized URL; PPE declaration; evidence upload (JPG/PNG/PDF ≤ 10MB); fit-for-purpose toggle; handover signature.
- Security: unguessable access tokens; signatures stored with UTC timestamps on an append-only audit trail.

## 5. Visual identity

Industrial Compliance System. Desktop: side navigation and top header. Mobile contractor: bottom navigation. Outlined form fields with validation states. Dark control-room chrome with paper permit surfaces.
