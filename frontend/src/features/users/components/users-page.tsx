import { Main } from '@/components/layout/main'
import { useUsers } from '../hooks/use-users'

export function UsersPage() {
  const { data: users = [], isLoading, error } = useUsers()

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
        <div className="flex h-64 items-center justify-center text-red-500">
          Failed to load users.
        </div>
      </Main>
    )
  }

  return (
    <Main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage your application users.
        </p>
      </div>

      <div className="rounded-lg border">
        <table className="w-full">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Roles</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.roles.join(', ')}</td>
                  <td className="p-3">
                    {user.isActive ? 'Active' : 'Inactive'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Main>
  )
}
