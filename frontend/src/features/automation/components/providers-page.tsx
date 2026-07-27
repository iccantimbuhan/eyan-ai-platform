import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { useCan } from '@/features/auth/hooks/use-can'
import { ForbiddenError } from '@/features/errors/forbidden'
import { useMcpProviders } from '../hooks/use-mcp-servers'

export function ProvidersPage() {
  const can = useCan()
  const { data: providers = [], isLoading, error } = useMcpProviders()

  if (!can('automation')) return <ForbiddenError />

  return (
    <Main className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Providers</h1>
        <p className='text-muted-foreground'>
          MCP connector types registered on this server. Real providers
          (GitHub, Canva, Slack, ...) are added in later sprints — only the
          "fake" development connector exists today.
        </p>
      </div>

      {isLoading && (
        <div className='flex h-40 items-center justify-center text-muted-foreground'>
          Loading providers...
        </div>
      )}

      {!isLoading && error && (
        <div className='flex h-40 items-center justify-center text-destructive'>
          Failed to load registered providers.
        </div>
      )}

      {!isLoading && !error && providers.length === 0 && (
        <div className='flex h-40 flex-col items-center justify-center gap-1 text-center text-muted-foreground'>
          <p>No MCP providers are registered.</p>
          <p className='text-sm'>Providers are registered at server startup, not created here.</p>
        </div>
      )}

      {!isLoading && !error && providers.length > 0 && (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {providers.map((name) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className='capitalize'>{name}</CardTitle>
                <CardDescription>MCP connector</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant='outline'>Registered</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Main>
  )
}
