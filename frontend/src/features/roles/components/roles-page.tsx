import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useRoles } from '../hooks/use-roles'
import { RoleDialog } from './role-dialog'
import { RolesTable } from './roles-table'

export function RolesPage() {
  const can = useCan()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: roles = [], isLoading, error } = useRoles()
  if (!can('roles')) return <ForbiddenError />
  if (isLoading)
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>
          Loading roles...
        </div>
      </Main>
    )
  if (error)
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-destructive'>
          Failed to load roles.
        </div>
      </Main>
    )
  return (
    <>
      <Main className='space-y-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Roles</h1>
            <p className='text-muted-foreground'>
              Manage roles and the access they provide.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>New Role</Button>
        </div>
        <RolesTable roles={roles} />
      </Main>
      <RoleDialog
        mode='create'
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  )
}
