import { z } from 'zod'

export const leadEditSchema = z.object({
  contactName: z.string().trim().min(1, 'Name is required.').max(200),
  email: z.email('A valid email is required.'),
  phone: z.string().trim().max(50).optional(),
  company: z.string().trim().max(200).optional(),
  industry: z.string().trim().max(200).optional(),
  companySize: z.string().trim().max(100).optional(),
})

export type LeadEditFormValues = z.infer<typeof leadEditSchema>

export const leadNoteSchema = z.object({
  body: z.string().trim().min(1, 'Note text is required.').max(2000),
})

export type LeadNoteFormValues = z.infer<typeof leadNoteSchema>

export const leadStatusChangeSchema = z.object({
  status: z.string().min(1, 'Select a status.'),
  lostReason: z.string().trim().max(500).optional(),
})

export type LeadStatusChangeFormValues = z.infer<typeof leadStatusChangeSchema>

export const UNASSIGNED_VALUE = '__unassigned__'

export const leadAssignSchema = z.object({
  assignedToId: z.string(),
})

export type LeadAssignFormValues = z.infer<typeof leadAssignSchema>
