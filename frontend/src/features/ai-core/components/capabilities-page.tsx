import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useCapabilities, useDeleteCapability } from '../hooks/use-capabilities'
import type { AiCapability } from '../types/ai-core'
import { CapabilityDialog } from './capability-dialog'

export function CapabilitiesPage() {
  const can = useCan()
  const { data: capabilities = [], isLoading, error } = useCapabilities()
  const deleteCapability = useDeleteCapability()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCapability, setEditingCapability] =
    useState<AiCapability | null>(null)

  if (!can('aicore')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <PageHeader
        title='Capabilities'
        description='Business tasks a module or workflow invokes by key. Every Capability resolves to exactly one Brain — callers never reference a Brain, Provider, or Model directly.'
        breadcrumbs={[
          { label: 'AI Core', to: '/app/ai-core' },
          { label: 'Capabilities' },
        ]}
        actions={
          can('aicoreadmin') && (
            <Button onClick={() => setDialogOpen(true)}>New Capability</Button>
          )
        }
      />

      {isLoading && (
        <div className='flex h-40 items-center justify-center text-muted-foreground'>
          Loading...
        </div>
      )}
      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>
          Failed to load Capabilities.
        </div>
      )}

      {!isLoading && !error && (
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='w-48' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {capabilities.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className='h-24 text-center text-muted-foreground'
                  >
                    No Capabilities yet — create one to give a business module
                    something to invoke.
                  </TableCell>
                </TableRow>
              ) : (
                capabilities.map((capability) => (
                  <TableRow key={capability.id}>
                    <TableCell className='font-mono text-sm'>
                      {capability.key}
                    </TableCell>
                    <TableCell className='font-medium'>
                      {capability.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={capability.isEnabled ? 'default' : 'secondary'}
                      >
                        {capability.isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className='flex flex-wrap gap-2'>
                      {can('aicoreadmin') && (
                        <>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setEditingCapability(capability)}
                          >
                            Edit
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            disabled={deleteCapability.isPending}
                            onClick={() =>
                              deleteCapability.mutate(capability.id)
                            }
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

      <CapabilityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <CapabilityDialog
        open={editingCapability !== null}
        onOpenChange={(open) => !open && setEditingCapability(null)}
        capability={editingCapability}
      />
    </Main>
  )
}
