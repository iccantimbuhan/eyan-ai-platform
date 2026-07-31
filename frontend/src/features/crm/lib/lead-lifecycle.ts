import type { LeadPriority, LeadStatus } from '../types/crm'

// Mirrors backend/src/services/crm-lead.service.ts's ALLOWED_TRANSITIONS
// exactly — the backend is the actual enforcement point (never trust the
// client), this copy only drives which options the status dropdown offers,
// the same client/server duplication Finance's zod schema + express-validator
// pair already establishes for amount > 0.
const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['VALIDATED', 'DISQUALIFIED'],
  VALIDATED: ['AI_ANALYZED', 'LOST'],
  DISQUALIFIED: [],
  AI_ANALYZED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['CONTACTED', 'LOST'],
  CONTACTED: ['NEGOTIATION', 'LOST'],
  NEGOTIATION: ['CONVERTED', 'LOST'],
  CONVERTED: [],
  LOST: [],
}

export function getValidNextStatuses(current: LeadStatus): LeadStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? []
}

export function isTerminalStatus(status: LeadStatus): boolean {
  return getValidNextStatuses(status).length === 0
}

export const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'DISQUALIFIED', label: 'Disqualified' },
  { value: 'AI_ANALYZED', label: 'AI Analyzed' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'LOST', label: 'Lost' },
]

export function statusLabel(status: LeadStatus): string {
  return LEAD_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
}

// Badge variants from the existing design system only (default/secondary/
// destructive/outline) — no new color language introduced.
export function statusBadgeVariant(
  status: LeadStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'CONVERTED':
      return 'default'
    case 'LOST':
    case 'DISQUALIFIED':
      return 'destructive'
    case 'QUALIFIED':
    case 'CONTACTED':
    case 'NEGOTIATION':
      return 'secondary'
    default:
      return 'outline'
  }
}

export const LEAD_PRIORITY_OPTIONS: { value: LeadPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]

export function priorityLabel(priority: LeadPriority | null): string {
  if (!priority) return '—'
  return LEAD_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? priority
}

export function priorityBadgeVariant(
  priority: LeadPriority | null
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (priority) {
    case 'URGENT':
      return 'destructive'
    case 'HIGH':
      return 'default'
    case 'MEDIUM':
      return 'secondary'
    default:
      return 'outline'
  }
}
