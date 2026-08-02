import { useMutation } from '@tanstack/react-query'
import { submitLead, type SubmitLeadPayload } from '../api/lead-capture-api'

export function useSubmitLead() {
  return useMutation({
    mutationFn: (payload: SubmitLeadPayload) => submitLead(payload),
  })
}
