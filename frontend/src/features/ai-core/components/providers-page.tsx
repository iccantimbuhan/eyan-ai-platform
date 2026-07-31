import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { ProviderDialog } from './provider-dialog'
import { ProviderCredentialDialog } from './provider-credential-dialog'
import { useCheckProviderHealth, useDeleteProvider, useProviders } from '../hooks/use-providers'
import { AiHealthStatusBadge } from '../lib/status-badges'

export function ProvidersPage() {
  const can = useCan()
  const { data: providers = [], isLoading, error } = useProviders()
  const deleteProvider = useDeleteProvider()
  const checkHealth = useCheckProviderHealth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [credentialProviderId, setCredentialProviderId] = useState<string | null>(null)

  if (!can('aicore')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Providers</h1>
          <p className='text-muted-foreground'>Registered AI provider plugins — Ollama, OpenAI, Anthropic, Gemini.</p>
        </div>
        {can('aicoreadmin') && <Button onClick={() => setDialogOpen(true)}>New Provider</Button>}
      </div>

      {isLoading && <div className='flex h-40 items-center justify-center text-muted-foreground'>Loading...</div>}
      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>Failed to load providers.</div>
      )}

      {!isLoading && !error && (
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Health</TableHead>
                <TableHead className='w-72' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                    No providers registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className='font-mono text-sm'>{provider.key}</TableCell>
                    <TableCell className='font-medium'>{provider.displayName}</TableCell>
                    <TableCell>
                      <Badge variant='outline'>{provider.kind}</Badge>
                    </TableCell>
                    <TableCell>
                      <AiHealthStatusBadge status={provider.healthStatus} />
                    </TableCell>
                    <TableCell className='flex flex-wrap gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={checkHealth.isPending}
                        onClick={() => checkHealth.mutate(provider.id)}
                      >
                        Check Health
                      </Button>
                      {can('aicoreadmin') && provider.kind === 'HOSTED' && (
                        <Button size='sm' variant='outline' onClick={() => setCredentialProviderId(provider.id)}>
                          Add Credential
                        </Button>
                      )}
                      {can('aicoreadmin') && (
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={deleteProvider.isPending}
                          onClick={() => deleteProvider.mutate(provider.id)}
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

      <ProviderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ProviderCredentialDialog
        providerId={credentialProviderId}
        onOpenChange={(open) => !open && setCredentialProviderId(null)}
      />
    </Main>
  )
}
