import { useMemo, useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useMcpServers } from '@/features/automation/hooks/use-mcp-servers'
import { useBrains, useDeleteBrain } from '../hooks/use-brains'
import { useCapabilities } from '../hooks/use-capabilities'
import { useProviders } from '../hooks/use-providers'
import { useModels } from '../hooks/use-models'
import { useActivatePrompt, usePrompts } from '../hooks/use-prompts'
import { useActivateRoutingPolicy, useRoutingPolicies } from '../hooks/use-routing-policy'
import { useBrainMcpTools, useRevokeBrainMcpTool } from '../hooks/use-brain-mcp-tools'
import { useEvaluations } from '../hooks/use-evaluations'
import { BrainDialog } from './brain-dialog'
import { RoutingPolicyDialog } from './routing-policy-dialog'
import { PromptVersionDialog } from './prompt-version-dialog'
import { McpToolDialog } from './mcp-tool-dialog'
import { EvaluationRunDialog } from './evaluation-run-dialog'

export function BrainDetailPage() {
  const { brainId } = useParams({ from: '/app/_authenticated/ai-core/brains/$brainId' })
  const can = useCan()

  const { data: brains = [], isLoading: brainsLoading } = useBrains()
  const brain = useMemo(() => brains.find((b) => b.id === brainId) ?? null, [brains, brainId])

  const { data: capabilities = [] } = useCapabilities()
  const { data: providers = [] } = useProviders()
  const { data: models = [] } = useModels()
  const { data: servers = [] } = useMcpServers()

  const { data: policies = [], isLoading: policiesLoading } = useRoutingPolicies(brainId)
  const activatePolicy = useActivateRoutingPolicy(brainId)
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false)

  const { data: prompts = [], isLoading: promptsLoading } = usePrompts(brainId)
  const activatePrompt = useActivatePrompt(brainId)
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [evaluatingPromptId, setEvaluatingPromptId] = useState<string | null>(null)

  const { data: mcpTools = [], isLoading: mcpToolsLoading } = useBrainMcpTools(brainId)
  const revokeMcpTool = useRevokeBrainMcpTool(brainId)
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false)

  const [evaluationsPromptId, setEvaluationsPromptId] = useState<string>('')
  const { data: evaluations = [] } = useEvaluations(brainId, evaluationsPromptId || null)

  const [editOpen, setEditOpen] = useState(false)
  const deleteBrain = useDeleteBrain()

  const providerName = (id: string) => providers.find((p) => p.id === id)?.displayName ?? id
  const modelName = (id: string) => models.find((m) => m.id === id)?.displayName ?? id
  const serverName = (id: string) => servers.find((s) => s.id === id)?.name ?? id

  if (!can('aicore')) return <ForbiddenError />
  if (brainsLoading) return <Main><div className='flex h-40 items-center justify-center text-muted-foreground'>Loading...</div></Main>
  if (!brain) {
    return (
      <Main>
        <div className='flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground'>
          <p>Brain not found.</p>
          <Link to='/app/ai-core/brains' className='text-primary underline'>
            Back to Brains
          </Link>
        </div>
      </Main>
    )
  }

  return (
    <Main className='space-y-6'>
      <div>
        <Link
          to='/app/ai-core/brains'
          className='mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground'
        >
          <ArrowLeft className='size-4' /> Back to Brains
        </Link>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>{brain.name}</h1>
            <p className='font-mono text-sm text-muted-foreground'>{brain.key}</p>
          </div>
          {can('aicoreadmin') && (
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button
                variant='outline'
                disabled={deleteBrain.isPending}
                onClick={() => deleteBrain.mutate(brain.id)}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue='overview'>
        <TabsList>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='routing-policy'>Routing Policy</TabsTrigger>
          <TabsTrigger value='prompts'>Prompts</TabsTrigger>
          <TabsTrigger value='mcp-tools'>MCP Tools</TabsTrigger>
          <TabsTrigger value='evaluations'>Evaluations</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          <p className='text-muted-foreground'>{brain.description}</p>
          <div className='flex flex-wrap gap-2'>
            <Badge variant='outline'>{brain.category}</Badge>
            <Badge variant='outline'>{brain.memoryStrategy}</Badge>
            <Badge variant={brain.isEnabled ? 'default' : 'secondary'}>{brain.isEnabled ? 'Enabled' : 'Disabled'}</Badge>
          </div>
          <div>
            <h3 className='mb-2 text-sm font-medium'>Capabilities using this Brain</h3>
            {capabilities.filter((c) => c.brainId === brain.id).length === 0 ? (
              <p className='text-sm text-muted-foreground'>None yet.</p>
            ) : (
              <div className='flex flex-wrap gap-2'>
                {capabilities
                  .filter((c) => c.brainId === brain.id)
                  .map((c) => (
                    <Badge key={c.id} variant='outline' className='font-mono'>
                      {c.key}
                    </Badge>
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value='routing-policy' className='space-y-4'>
          <div className='flex justify-end'>
            {can('aicoreadmin') && <Button onClick={() => setPolicyDialogOpen(true)}>New Version</Button>}
          </div>
          {!policiesLoading && (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Preferred</TableHead>
                    <TableHead>Fallback</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Timeout</TableHead>
                    <TableHead>Confidence H/M</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='w-24' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className='h-24 text-center text-muted-foreground'>
                        No routing policy yet — this Brain cannot be invoked until one is active.
                      </TableCell>
                    </TableRow>
                  ) : (
                    policies.map((policy) => (
                      <TableRow key={policy.id}>
                        <TableCell>
                          <Badge variant='outline'>{policy.strategy}</Badge>
                        </TableCell>
                        <TableCell className='text-sm'>
                          {providerName(policy.preferredProviderId)} / {modelName(policy.preferredModelId)}
                        </TableCell>
                        <TableCell className='text-sm text-muted-foreground'>
                          {policy.fallbackProviderId
                            ? `${providerName(policy.fallbackProviderId)} / ${modelName(policy.fallbackModelId ?? '')}`
                            : 'None'}
                        </TableCell>
                        <TableCell>{policy.maxRetries}</TableCell>
                        <TableCell>{policy.timeoutMs}ms</TableCell>
                        <TableCell>
                          {policy.confidenceHighThreshold} / {policy.confidenceMediumThreshold}
                        </TableCell>
                        <TableCell>
                          <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                            {policy.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {can('aicoreadmin') && !policy.isActive && (
                            <Button
                              size='sm'
                              variant='outline'
                              disabled={activatePolicy.isPending}
                              onClick={() => activatePolicy.mutate(policy.id)}
                            >
                              Activate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value='prompts' className='space-y-4'>
          <div className='flex justify-end'>
            {can('aicoreadmin') && <Button onClick={() => setPromptDialogOpen(true)}>New Version</Button>}
          </div>
          {!promptsLoading && (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Body</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='w-48' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prompts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                        No prompt version yet — this Brain cannot be invoked until one is active.
                      </TableCell>
                    </TableRow>
                  ) : (
                    prompts.map((prompt) => (
                      <TableRow key={prompt.id}>
                        <TableCell className='font-mono text-sm'>{prompt.version}</TableCell>
                        <TableCell className='max-w-md truncate text-sm text-muted-foreground'>{prompt.body}</TableCell>
                        <TableCell>
                          <Badge variant={prompt.isActive ? 'default' : 'secondary'}>
                            {prompt.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className='flex flex-wrap gap-2'>
                          {can('aicoreadmin') && !prompt.isActive && (
                            <Button
                              size='sm'
                              variant='outline'
                              disabled={activatePrompt.isPending}
                              onClick={() => activatePrompt.mutate(prompt.id)}
                            >
                              Activate
                            </Button>
                          )}
                          {can('aicoreadmin') && (
                            <Button size='sm' variant='outline' onClick={() => setEvaluatingPromptId(prompt.id)}>
                              Evaluate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value='mcp-tools' className='space-y-4'>
          <div className='flex justify-end'>
            {can('aicoreadmin') && <Button onClick={() => setMcpDialogOpen(true)}>Allow Server</Button>}
          </div>
          {!mcpToolsLoading && (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MCP Server</TableHead>
                    <TableHead>Allowed Tools</TableHead>
                    <TableHead className='w-24' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mcpTools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className='h-24 text-center text-muted-foreground'>
                        No MCP servers allowed for this Brain yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mcpTools.map((tool) => (
                      <TableRow key={tool.id}>
                        <TableCell className='font-medium'>{serverName(tool.mcpServerConfigId)}</TableCell>
                        <TableCell className='text-sm text-muted-foreground'>
                          {tool.allowedTools.length > 0 ? tool.allowedTools.join(', ') : 'All tools'}
                        </TableCell>
                        <TableCell>
                          {can('aicoreadmin') && (
                            <Button
                              size='sm'
                              variant='outline'
                              disabled={revokeMcpTool.isPending}
                              onClick={() => revokeMcpTool.mutate(tool.id)}
                            >
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value='evaluations' className='space-y-4'>
          <div className='flex items-center justify-between gap-4'>
            <div className='w-64'>
              <Select value={evaluationsPromptId} onValueChange={setEvaluationsPromptId}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select a prompt version' />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.version}
                      {prompt.isActive ? ' (active)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {can('aicoreadmin') && (
              <Button disabled={!evaluationsPromptId} onClick={() => setEvaluatingPromptId(evaluationsPromptId)}>
                Run Evaluation
              </Button>
            )}
          </div>
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Case</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Evaluated At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!evaluationsPromptId ? (
                  <TableRow>
                    <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                      Select a prompt version to view its evaluations.
                    </TableCell>
                  </TableRow>
                ) : evaluations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                      No evaluations run against this version yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  evaluations.map((evaluation) => (
                    <TableRow key={evaluation.id}>
                      <TableCell className='font-medium'>{evaluation.testCaseName}</TableCell>
                      <TableCell>
                        <Badge variant={evaluation.passed ? 'default' : 'destructive'}>
                          {evaluation.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell>{evaluation.score ?? '—'}</TableCell>
                      <TableCell className='text-sm text-muted-foreground'>
                        {new Date(evaluation.evaluatedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <BrainDialog open={editOpen} onOpenChange={setEditOpen} brain={brain} />
      <RoutingPolicyDialog brainId={brain.id} open={policyDialogOpen} onOpenChange={setPolicyDialogOpen} />
      <PromptVersionDialog brainId={brain.id} open={promptDialogOpen} onOpenChange={setPromptDialogOpen} />
      <McpToolDialog brainId={brain.id} open={mcpDialogOpen} onOpenChange={setMcpDialogOpen} />
      <EvaluationRunDialog
        brainId={brain.id}
        promptId={evaluatingPromptId}
        onOpenChange={(open) => !open && setEvaluatingPromptId(null)}
      />
    </Main>
  )
}
