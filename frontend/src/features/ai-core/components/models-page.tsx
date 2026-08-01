import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { ModelDialog } from './model-dialog'
import { useDeleteModel, useModels } from '../hooks/use-models'
import { useProviders } from '../hooks/use-providers'
import type { AiModel } from '../types/ai-core'

export function ModelsPage() {
  const can = useCan()
  const { data: models = [], isLoading, error } = useModels()
  const { data: providers = [] } = useProviders()
  const deleteModel = useDeleteModel()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<AiModel | null>(null)

  if (!can('aicore')) return <ForbiddenError />

  const providerName = (providerId: string) => providers.find((provider) => provider.id === providerId)?.displayName ?? providerId

  return (
    <Main className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Models</h1>
          <p className='text-muted-foreground'>Models exposed by each provider — never referenced by business modules directly.</p>
        </div>
        {can('aicoreadmin') && <Button onClick={() => setDialogOpen(true)}>New Model</Button>}
      </div>

      {isLoading && <div className='flex h-40 items-center justify-center text-muted-foreground'>Loading...</div>}
      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>Failed to load models.</div>
      )}

      {!isLoading && !error && (
        <div className='rounded-lg border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model Key</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className='w-48' />
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                    No models registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                models.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className='font-mono text-sm'>{model.modelKey}</TableCell>
                    <TableCell>{providerName(model.providerId)}</TableCell>
                    <TableCell className='space-x-1'>
                      {model.tags.map((tag) => (
                        <Badge key={tag} variant='outline'>
                          {tag}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell className='flex flex-wrap gap-2'>
                      {can('aicoreadmin') && (
                        <>
                          <Button size='sm' variant='outline' onClick={() => setEditingModel(model)}>
                            Edit
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            disabled={deleteModel.isPending}
                            onClick={() => deleteModel.mutate(model.id)}
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

      <ModelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ModelDialog open={editingModel !== null} onOpenChange={(open) => !open && setEditingModel(null)} model={editingModel} />
    </Main>
  )
}
