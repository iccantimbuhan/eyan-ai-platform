import { z } from 'zod'

export const mcpServerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
  provider: z.string().trim().min(1, 'Provider is required.').max(100),
  transport: z.enum(['STDIO', 'HTTP', 'SSE']),
  command: z.string().trim().max(500).optional(),
  // Newline-separated in the UI, split into a string[] before submit — the
  // backend expects args as an array, but a single free-text field is a
  // simpler input than a dynamic list widget for this foundation milestone.
  argsText: z.string().trim().optional(),
  url: z.string().trim().max(500).optional(),
  connectionId: z.string().optional(),
  isEnabled: z.boolean(),
})
export type McpServerFormValues = z.infer<typeof mcpServerSchema>
export const defaultMcpServerValues: McpServerFormValues = {
  name: '',
  provider: '',
  transport: 'STDIO',
  command: '',
  argsText: '',
  url: '',
  connectionId: '',
  isEnabled: true,
}

export function parseArgsText(argsText: string | undefined): string[] {
  if (!argsText) return []
  return argsText
    .split('\n')
    .map((arg) => arg.trim())
    .filter((arg) => arg.length > 0)
}
