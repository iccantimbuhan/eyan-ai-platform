import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { CapabilityDialog } from './capability-dialog'
import { useCapabilities, useDeleteCapability } from '../hooks/use-capabilities'

export function CapabilitiesPage() {
  const can = useCan()
  const { data: capabilities = [], isLoading, error } = useCapabilities()
  const deleteCapability = useDeleteCapability()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!can('aicore')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Capabilities</h1>
          <p className='text-muted-foreground'>
            Business tasks a module or workflow invokes by key. Every Capability resolves to exactly one Brain —
            callers never reference a Brain, Provider, or Model directly.
          </p>
        </div>
        {can('aicoreadmin') && <Button onClick={() => setDialogOpen(true)}>New Capability</Button>}
      </div>

      {isLoading && <div className='flex h-40 items-center justify-center text-muted-foreground'>Loading...</div>}
      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>Failed to load Capabilities.</div>
      )}

      {!isLoading && !error && (
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='w-24' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {capabilities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                    No Capabilities yet — create one to give a business module something to invoke.
                  </TableCell>
                </TableRow>
              ) : (
                capabilities.map((capability) => (
                  <TableRow key={capability.id}>
                    <TableCell className='font-mono text-sm'>{capability.key}</TableCell>
                    <TableCell className='font-medium'>{capability.name}</TableCell>
                    <TableCell>
                      <Badge variant={capability.isEnabled ? 'default' : 'secondary'}>
                        {capability.isEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {can('aicoreadmin') && (
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={deleteCapability.isPending}
                          onClick={() => deleteCapability.mutate(capability.id)}
                        >
                          Delete
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

      <CapabilityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Main>
  )
}
