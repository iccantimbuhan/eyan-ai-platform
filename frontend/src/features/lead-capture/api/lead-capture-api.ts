import { api } from '@/services/api'

// Mirrors backend/src/dto/crm-lead.dto.ts's CreateLeadDto. contactName/email/
// phone/company/industry/companySize are the only fields the backend treats
// as structured columns; country/website/budget/message have no column and
// are only ever captured verbatim in Lead.rawSubmission (an existing Json
// audit field — see CrmLeadService.create) for record-keeping. They are not
// currently read by the AI qualification prompt.
export interface SubmitLeadPayload {
  contactName: string
  email: string
  phone?: string
  company?: string
  industry?: string
  companySize?: string
  country?: string
  website?: string
  budget?: string
  message?: string
}

export async function submitLead(payload: SubmitLeadPayload): Promise<void> {
  await api.post('/crm/leads', payload)
}
