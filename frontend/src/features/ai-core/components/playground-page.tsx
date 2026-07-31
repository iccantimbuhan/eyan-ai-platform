import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useCapabilities } from '../hooks/use-capabilities'
import { useBrains } from '../hooks/use-brains'
import { useModels } from '../hooks/use-models'
import { useProviders } from '../hooks/use-providers'
import { useInvokePlayground, usePlaygroundHistory } from '../hooks/use-playground'
import { AiConfidenceBadge, AiOutcomeBadge } from '../lib/status-badges'
import type { AiInvokeResult } from '../types/ai-core'

const TARGET_MODE = { CAPABILITY: 'capability', BRAIN: 'brain' } as const

// The engineering validation environment (TDD §13) — execute a Capability
// or (admin-only) a Brain directly, with optional one-off provider/model/
// prompt-version overrides. Every execution is domain-tagged
// "ai-core-playground" server-side and never touches production routing —
// see AiRoutingService.invokePlayground().
export function PlaygroundPage() {
  const can = useCan()
  const { data: capabilities = [] } = useCapabilities()
  const { data: brains = [] } = useBrains()
  const { data: providers = [] } = useProviders()
  const { data: models = [] } = useModels()
  const { data: history } = usePlaygroundHistory(1, 10)
  const invoke = useInvokePlayground()

  const [targetMode, setTargetMode] = useState<(typeof TARGET_MODE)[keyof typeof TARGET_MODE]>(TARGET_MODE.CAPABILITY)
  const [targetKey, setTargetKey] = useState('')
  const [inputText, setInputText] = useState('{\n  \n}')
  const [overrideProviderId, setOverrideProviderId] = useState('')
  const [overrideModelId, setOverrideModelId] = useState('')
  const [overridePromptVersion, setOverridePromptVersion] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [result, setResult] = useState<AiInvokeResult | null>(null)

  if (!can('aicoreadmin')) return <ForbiddenError />

  async function run() {
    try {
      const input = JSON.parse(inputText)
      setInputError(null)
      const response = await invoke.mutateAsync({
        capabilityKey: targetMode === TARGET_MODE.CAPABILITY ? targetKey : undefined,
        brainKey: targetMode === TARGET_MODE.BRAIN ? targetKey : undefined,
        input,
        overrides: {
          providerId: overrideProviderId || undefined,
          modelId: overrideModelId || undefined,
          promptVersion: overridePromptVersion || undefined,
        },
      })
      setResult(response)
    } catch {
      setInputError('Input must be valid JSON.')
    }
  }

  return (
    <Main className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Playground</h1>
        <p className='text-muted-foreground'>
          Execute a Capability or Brain with optional provider/model/prompt overrides. Never modifies production
          routing; excluded from usage/cost reporting.
        </p>
      </div>

      <div className='grid gap-6 lg:grid-cols-2'>
        <div className='space-y-4 rounded-lg border p-4'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Target</Label>
              <Select value={targetMode} onValueChange={(value) => { setTargetMode(value as typeof targetMode); setTargetKey('') }}>
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TARGET_MODE.CAPABILITY}>Capability</SelectItem>
                  <SelectItem value={TARGET_MODE.BRAIN}>Brain (admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label>{targetMode === TARGET_MODE.CAPABILITY ? 'Capability' : 'Brain'}</Label>
              <Select value={targetKey} onValueChange={setTargetKey}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select...' />
                </SelectTrigger>
                <SelectContent>
                  {(targetMode === TARGET_MODE.CAPABILITY ? capabilities : brains).map((item) => (
                    <SelectItem key={item.id} value={item.key}>
                      {item.name} ({item.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>Input (JSON)</Label>
            <Textarea rows={6} className='font-mono text-sm' value={inputText} onChange={(event) => setInputText(event.target.value)} />
            {inputError && <p className='text-sm text-destructive'>{inputError}</p>}
          </div>

          <details className='rounded-md border p-3'>
            <summary className='cursor-pointer text-sm font-medium'>Overrides (optional, one-off)</summary>
            <div className='mt-3 grid gap-3 sm:grid-cols-3'>
              <div className='space-y-2'>
                <Label>Provider</Label>
                <Select value={overrideProviderId} onValueChange={setOverrideProviderId}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Default' />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Model</Label>
                <Select value={overrideModelId} onValueChange={setOverrideModelId}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Default' />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.modelKey}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Prompt Version</Label>
                <Input placeholder='e.g. v2' value={overridePromptVersion} onChange={(event) => setOverridePromptVersion(event.target.value)} />
              </div>
            </div>
          </details>

          <Button onClick={run} disabled={invoke.isPending || !targetKey} className='w-full'>
            {invoke.isPending ? 'Running...' : 'Execute'}
          </Button>
        </div>

        <div className='space-y-4 rounded-lg border p-4'>
          <h2 className='font-medium'>Result</h2>
          {!result && <p className='text-sm text-muted-foreground'>Run an execution to see the structured output and raw response here.</p>}
          {result && (
            <div className='space-y-3'>
              <div className='flex flex-wrap gap-2'>
                <AiOutcomeBadge outcome={result.outcome} />
                <AiConfidenceBadge confidence={result.confidence} />
                {result.needsManualReview && <Badge variant='destructive'>Needs Manual Review</Badge>}
                <Badge variant='outline'>{result.provider}</Badge>
                <Badge variant='outline'>{result.model}</Badge>
                <Badge variant='outline'>prompt {result.promptVersion}</Badge>
                <Badge variant='outline'>{result.latencyMs}ms</Badge>
                <Badge variant='outline'>{result.retryCount} retries</Badge>
              </div>
              <div className='space-y-2'>
                <Label>Structured Output</Label>
                <pre className='max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs'>
                  {result.outputJson !== undefined ? JSON.stringify(result.outputJson, null, 2) : '(not requested as JSON)'}
                </pre>
              </div>
              <div className='space-y-2'>
                <Label>Raw Response</Label>
                <pre className='max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs'>{result.output}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='space-y-2'>
        <h2 className='font-medium'>Execution History</h2>
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Outcome</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Manual Review</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!history || history.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                    No Playground executions yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <AiOutcomeBadge outcome={entry.outcome} />
                    </TableCell>
                    <TableCell>{entry.retryCount}</TableCell>
                    <TableCell>{entry.latencyMs ? `${entry.latencyMs}ms` : '—'}</TableCell>
                    <TableCell>{entry.needsManualReview ? 'Yes' : 'No'}</TableCell>
                    <TableCell className='text-muted-foreground'>{new Date(entry.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Main>
  )
}
