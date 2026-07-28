import { createFileRoute } from '@tanstack/react-router'
import { McpServersPage } from '@/features/automation'

export const Route = createFileRoute('/app/_authenticated/automation/mcp-servers/')({
  component: McpServersPage,
})
