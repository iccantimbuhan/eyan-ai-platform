import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
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
        <PageHeader
          title='Roles'
          description='Manage roles and the access they provide.'
          breadcrumbs={[{ label: 'Administration' }, { label: 'Roles' }]}
          actions={
            <Button onClick={() => setCreateOpen(true)}>New Role</Button>
          }
        />
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
