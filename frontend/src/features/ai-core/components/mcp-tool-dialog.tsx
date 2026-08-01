import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMcpServers } from '@/features/automation/hooks/use-mcp-servers'
import { parseTagsText } from '../schemas/provider-schema'
import { useAllowBrainMcpTool } from '../hooks/use-brain-mcp-tools'

type Props = { brainId: string; open: boolean; onOpenChange: (open: boolean) => void }

// Reuses MCP Foundation's existing McpServerConfig registry entirely
// unchanged (TDD §12) — no new tool catalog, allowedTools is free text
// (empty = every tool on that server is allowed), same convention as
// AiModel.tags.
export function McpToolDialog({ brainId, open, onOpenChange }: Props) {
  const { data: servers = [] } = useMcpServers()
  const allow = useAllowBrainMcpTool(brainId)
  const [mcpServerConfigId, setMcpServerConfigId] = useState('')
  const [allowedToolsText, setAllowedToolsText] = useState('')

  function reset() {
    setMcpServerConfigId('')
    setAllowedToolsText('')
  }

  async function submit() {
    if (!mcpServerConfigId) return
    await allow.mutateAsync({ mcpServerConfigId, allowedTools: parseTagsText(allowedToolsText) })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Allow MCP Server</DialogTitle>
          <DialogDescription>Leave tools blank to allow every tool on that server.</DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>MCP Server</Label>
            <Select value={mcpServerConfigId} onValueChange={setMcpServerConfigId}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select an MCP server' />
              </SelectTrigger>
              <SelectContent>
                {servers.map((server) => (
                  <SelectItem key={server.id} value={server.id}>
                    {server.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label>Allowed Tools (comma-separated, optional)</Label>
            <Input
              placeholder='e.g. search, fetch'
              value={allowedToolsText}
              onChange={(event) => setAllowedToolsText(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={allow.isPending}>
            Cancel
          </Button>
          <Button type='button' onClick={submit} disabled={allow.isPending || !mcpServerConfigId}>
            {allow.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
