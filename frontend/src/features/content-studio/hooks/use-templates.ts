import { useQuery } from '@tanstack/react-query'

import { promptTemplatesApi } from '../api/prompt-templates.api'

export function useTemplates() {
  return useQuery({
    queryKey: ['prompt-templates'],
    queryFn: () => promptTemplatesApi.getTemplates(),
    // Longer than the app-wide 10s default: this is a read-only, admin-seeded
    // catalog with no user-facing write path, so it can only change via a
    // backend redeploy (which resets every client's cache anyway).
    staleTime: 5 * 60 * 1000,
  })
}
