import { api } from '@/services/api'
import type {
  ApiResponse,
  Lead,
  LeadDetail,
  LeadPriority,
  LeadStatus,
  PaginatedResponse,
} from '../types/crm'

export interface ListLeadsParams {
  page?: number
  pageSize?: number
  status?: LeadStatus
  priority?: LeadPriority
  assignedToId?: string
  search?: string
}

export async function getLeads(params: ListLeadsParams = {}): Promise<PaginatedResponse<Lead>> {
  const { data } = await api.get<PaginatedResponse<Lead>>('/crm/leads', {
    params: { pageSize: 100, ...params },
  })
  return data
}

export async function getLead(id: string): Promise<LeadDetail> {
  const { data } = await api.get<ApiResponse<LeadDetail>>(`/crm/leads/${id}`)
  return data.data
}

export interface UpdateLeadPayload {
  contactName?: string
  email?: string
  phone?: string
  company?: string
  industry?: string
  companySize?: string
}

export async function updateLead(id: string, payload: UpdateLeadPayload): Promise<Lead> {
  const { data } = await api.patch<ApiResponse<Lead>>(`/crm/leads/${id}`, payload)
  return data.data
}

export interface UpdateLeadStatusPayload {
  status: LeadStatus
  priority?: LeadPriority
  lostReason?: string
}

export async function updateLeadStatus(
  id: string,
  payload: UpdateLeadStatusPayload
): Promise<Lead> {
  const { data } = await api.patch<ApiResponse<Lead>>(`/crm/leads/${id}/status`, payload)
  return data.data
}

export async function assignLead(id: string, assignedToId: string | null): Promise<Lead> {
  const { data } = await api.patch<ApiResponse<Lead>>(`/crm/leads/${id}/assign`, {
    assignedToId,
  })
  return data.data
}

export async function addLeadNote(id: string, body: string): Promise<LeadDetail> {
  const { data } = await api.post<ApiResponse<LeadDetail>>(`/crm/leads/${id}/notes`, { body })
  return data.data
}

// Phase 7 (Manual Review Queue) — re-runs AI Core's lead-qualification
// Capability in-process and re-applies the result (new LeadAiAnalysis row,
// pipeline routing, Activities) — see CrmLeadService.rerunQualification.
export async function rerunLeadQualification(id: string): Promise<Lead> {
  const { data } = await api.post<ApiResponse<Lead>>(`/crm/leads/${id}/qualification/rerun`)
  return data.data
}
