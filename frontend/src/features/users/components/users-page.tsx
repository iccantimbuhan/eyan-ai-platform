import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { useCreateUserDialog } from '../hooks/use-create-user-dialog'
import { useUsers } from '../hooks/use-users'
import { CreateUserDialog } from './create-user-dialog'
import { UsersTable } from './users-table'

export function UsersPage() {
  const { data: users = [], isLoading, error } = useUsers()

  const createDialog = useCreateUserDialog()

  if (isLoading) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center'>
          Loading users...
        </div>
      </Main>
    )
  }

  if (error) {
    return (
      <Main>
        <div className='flex h-64 items-center justify-center text-destructive'>
          Failed to load users.
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main className='space-y-6'>
        <PageHeader
          title='Users'
          description='Manage your application users.'
          breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
          actions={<Button onClick={createDialog.openDialog}>New User</Button>}
        />

        <UsersTable users={users} />
      </Main>

      <CreateUserDialog
        open={createDialog.open}
        onOpenChange={createDialog.setOpen}
      />
    </>
  )
}
