import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'

import { useUsers } from '../hooks/use-users'
import { useCreateUserDialog } from '../hooks/use-create-user-dialog'

import { UsersTable } from './users-table'
import { CreateUserDialog } from './create-user-dialog'

export function UsersPage() {
  const { data: users = [], isLoading, error } = useUsers()

  const createDialog = useCreateUserDialog()

  if (isLoading) {
    return (
      <Main>
        <div className="flex h-64 items-center justify-center">
          Loading users...
        </div>
      </Main>
    )
  }

  if (error) {
    return (
      <Main>
        <div className="flex h-64 items-center justify-center text-destructive">
          Failed to load users.
        </div>
      </Main>
    )
  }

  return (
    <>
      <Main className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Users
            </h1>

            <p className="text-muted-foreground">
              Manage your application users.
            </p>
          </div>

          <Button onClick={createDialog.openDialog}>
            New User
          </Button>
        </div>

        <UsersTable users={users} />
      </Main>

      <CreateUserDialog
        open={createDialog.open}
        onOpenChange={createDialog.setOpen}
      />
    </>
  )
}
