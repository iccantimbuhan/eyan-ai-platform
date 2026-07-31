export type LeadSource = 'WEBSITE_FORM' | 'MANUAL' | 'API'

export type LeadStatus =
  | 'NEW'
  | 'VALIDATED'
  | 'DISQUALIFIED'
  | 'AI_ANALYZED'
  | 'QUALIFIED'
  | 'CONTACTED'
  | 'NEGOTIATION'
  | 'CONVERTED'
  | 'LOST'

export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type LeadActivityType = 'NOTE' | 'STATUS_CHANGE' | 'AI_ANALYSIS' | 'AUTOMATION' | 'ASSIGNMENT'

export interface Lead {
  id: string
  source: LeadSource
  contactName: string
  email: string
  phone: string | null
  company: string | null
  industry: string | null
  companySize: string | null
  status: LeadStatus
  score: number | null
  priority: LeadPriority | null
  assignedToId: string | null
  lostReason: string | null
  createdAt: string
  updatedAt: string
}

export interface LeadActivity {
  id: string
  leadId: string
  type: LeadActivityType
  actorId: string | null
  body: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

// Sprint 2/3 (n8n AI qualification) populates these — the shape is defined
// now so the Lead Detail page can render an empty state without changing
// contracts later. See TDD §14/§16.
export interface LeadAiAnalysis {
  id: string
  leadId: string
  provider: string
  model: string
  promptVersion: string
  leadScore: number
  confidence: number
  priority: LeadPriority
  industry: string | null
  companySizeEstimate: string | null
  budgetEstimateMin: string | null
  budgetEstimateMax: string | null
  budgetEstimateCurrency: string | null
  buyingIntent: 'LOW' | 'MEDIUM' | 'HIGH' | null
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | null
  decisionMakerIdentified: boolean | null
  estimatedTimeline: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' | 'UNKNOWN' | null
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null
  painPoints: string[]
  recommendedAction: string
  summary: string
  reasoning: string
  needsManualReview: boolean
  createdAt: string
}

export interface WorkflowExecutionLog {
  id: string
  domain: string
  workflowName: string
  leadId: string | null
  n8nExecutionId: string | null
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'RETRYING'
  durationMs: number | null
  errorMessage: string | null
  createdAt: string
}

export interface LeadDetail extends Lead {
  activities: LeadActivity[]
  aiAnalyses: LeadAiAnalysis[]
  executionLogs: WorkflowExecutionLog[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: PaginationMeta
}
