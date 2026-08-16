import type { NatureOfWork, PermitStatus, SiteLocation } from '../types'

export const SITES: SiteLocation[] = ['Darth Valley Hospital', "Queen Mary's Hospital"]

export const STATUS_LABEL: Record<PermitStatus, string> = {
  draft: 'Draft',
  active: 'With engineer',
  pending_user: 'User review',
  pending_review: 'AP(D) review',
  completed: 'Closed',
}

export const NATURE_LABEL: Record<NatureOfWork, string> = {
  repair: 'Repair',
  maintenance: 'Maintenance',
  service: 'Service',
}

export const PTW_STEPS = [
  { id: 1, label: 'Part 1', title: 'User checks' },
  { id: 2, label: 'Part 2', title: 'CP(D) declaration' },
  { id: 3, label: 'Part 3', title: 'Hand-back' },
  { id: 4, label: 'Part 4', title: 'User review' },
  { id: 5, label: 'Part 5', title: 'AP(D) close' },
] as const

export function formatStamp(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date)
}

export function formatRelative(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  const delta = Date.now() - date.getTime()
  const minutes = Math.round(delta / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatStamp(value)
}

export function initials(name?: string | null) {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function managerName() {
  try {
    const raw = sessionStorage.getItem('ics.auth')
    if (raw) {
      const parsed = JSON.parse(raw) as { name?: string }
      if (parsed.name) return parsed.name
    }
  } catch {
    /* ignore */
  }
  return localStorage.getItem('ics.manager') || 'John Ferrer'
}

export function setManagerName(name: string) {
  localStorage.setItem('ics.manager', name)
}

export function eventLabel(type: string) {
  const map: Record<string, string> = {
    'permit.created': 'Part 1 drafted',
    'access.issued': 'Shared with engineer',
    'declaration.signed': 'Part 2 signed',
    'evidence.uploaded': 'Evidence attached',
    'handover.submitted': 'Part 3 hand-back',
    'user.reviewed': 'Part 4 user review',
    'audit.locked': 'Part 5 closed to vault',
  }
  return map[type] || type
}

export function currentPart(status: PermitStatus) {
  if (status === 'draft') return 1
  if (status === 'active') return 2
  if (status === 'pending_user') return 4
  if (status === 'pending_review') return 5
  return 5
}
