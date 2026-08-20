export type PermitStatus = 'draft' | 'active' | 'pending_user' | 'pending_review' | 'completed'
export type NatureOfWork = 'repair' | 'maintenance' | 'service'
export type SiteLocation = 'Darth Valley Hospital' | "Queen Mary's Hospital"

export type SignatureRecord = {
  id: string
  permit_id: string
  part: 'user' | 'declaration' | 'handover' | 'user_review' | 'audit'
  signer_name: string
  signer_role: string
  image_png: string
  signed_at: string
  user_agent: string | null
}

export type EvidenceRecord = {
  id: string
  permit_id: string
  original_name: string
  stored_name: string
  content_type: string
  size_bytes: number
  uploaded_at: string
}

export type AuditEvent = {
  id: string
  permit_id: string
  event_type: string
  actor: string
  payload: Record<string, unknown>
  created_at: string
}

export type Permit = {
  id: string
  equipment_sn: string
  equipment_name?: string
  location: string
  nature_of_work: NatureOfWork
  description: string
  decontaminated?: boolean
  status: PermitStatus
  access_token?: string | null
  access_url?: string
  contractor_name?: string | null
  work_details?: string | null
  fit_for_purpose?: boolean | null
  not_fit_reason?: string | null
  user_fit?: boolean | null
  user_not_fit_details?: string | null
  created_by: string
  created_at: string
  updated_at: string
  activated_at?: string | null
  submitted_at?: string | null
  audited_at?: string | null
  signatures: SignatureRecord[]
  evidence: EvidenceRecord[]
  audit_trail?: AuditEvent[]
  token?: string
}

export type DashboardPayload = {
  counts: Record<string, number>
  permits: Permit[]
}

export type AnalyticsPeriodCounts = {
  created: number
  activated: number
  completed: number
}

export type AnalyticsMonthlyFlow = {
  month: string
  label: string
  opened: number
  activated: number
  closed: number
  cumulative_closed: number
}

export type AnalyticsMonthlyStatus = {
  month: string
  label: string
  draft: number
  active: number
  pending_user: number
  pending_review: number
  completed: number
}

export type AnalyticsLocationRow = {
  location: string
  total: number
  draft: number
  active: number
  pending_user: number
  pending_review: number
  completed: number
}

export type AnalyticsNatureRow = {
  nature: string
  total: number
  open: number
  completed: number
  recent: number
}

export type AnalyticsPayload = {
  generated_at: string
  period_days: number
  months: number
  current: {
    counts: Record<string, number>
    open_pipeline: number
  }
  comparison: {
    current: AnalyticsPeriodCounts
    previous: AnalyticsPeriodCounts
    delta: AnalyticsPeriodCounts
  }
  monthly_flow: AnalyticsMonthlyFlow[]
  monthly_status: AnalyticsMonthlyStatus[]
  by_location: AnalyticsLocationRow[]
  by_nature: AnalyticsNatureRow[]
  quality: {
    fit: number
    not_fit: number
    pending_fit: number
    completion_rate: number
    avg_days_to_close: number | null
  }
  history: {
    all_time_created: number
    all_time_completed: number
    oldest_permit: string | null
    newest_permit: string | null
  }
}
