import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { BrainDialog } from './brain-dialog'
import { useBrains, useDeleteBrain } from '../hooks/use-brains'
import type { AiBrain } from '../types/ai-core'

// Deliberately no "invoke" action here — Brain-direct invocation is
// administrative/Playground-only (architecture frozen, ADR-0021); use the
// Playground page to test a Brain directly. Provider/model/prompt/routing
// policy/MCP tool configuration lives on the Brain detail page (Manage).
export function BrainsPage() {
  const can = useCan()
  const { data: brains = [], isLoading, error } = useBrains()
  const deleteBrain = useDeleteBrain()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBrain, setEditingBrain] = useState<AiBrain | null>(null)

  if (!can('aicore')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Brains</h1>
          <p className='text-muted-foreground'>
            Reusable AI configurations — provider, model, prompt, and routing policy. One or more Capabilities may
            share a Brain.
          </p>
        </div>
        {can('aicoreadmin') && <Button onClick={() => setDialogOpen(true)}>New Brain</Button>}
      </div>

      {isLoading && <div className='flex h-40 items-center justify-center text-muted-foreground'>Loading...</div>}
      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>Failed to load Brains.</div>
      )}

      {!isLoading && !error && (
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='w-64' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {brains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-24 text-center text-muted-foreground'>
                    No Brains yet — create one, then open it to add a Routing Policy and a Prompt version.
                  </TableCell>
                </TableRow>
              ) : (
                brains.map((brain) => (
                  <TableRow key={brain.id}>
                    <TableCell className='font-mono text-sm'>{brain.key}</TableCell>
                    <TableCell className='font-medium'>{brain.name}</TableCell>
                    <TableCell className='text-muted-foreground'>{brain.category}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>{brain.memoryStrategy}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={brain.isEnabled ? 'default' : 'secondary'}>
                        {brain.isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className='flex flex-wrap gap-2'>
                      <Button size='sm' variant='outline' asChild>
                        <Link to='/app/ai-core/brains/$brainId' params={{ brainId: brain.id }}>
                          Manage
                        </Link>
                      </Button>
                      {can('aicoreadmin') && (
                        <>
                          <Button size='sm' variant='outline' onClick={() => setEditingBrain(brain)}>
                            Edit
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            disabled={deleteBrain.isPending}
                            onClick={() => deleteBrain.mutate(brain.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <BrainDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <BrainDialog open={editingBrain !== null} onOpenChange={(open) => !open && setEditingBrain(null)} brain={editingBrain} />
    </Main>
  )
}
