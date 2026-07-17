import { MessageSquare, Server, Cpu, RotateCcw } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { StatusBadge } from './components/status-badge'
import { ModelCard } from './components/model-card'
import { StatCard } from './components/stat-card'
import { useHealth } from './hooks/useHealth'
import { useModels } from './hooks/useModels'

export function Dashboard() {
  const { data: health, isLoading: healthLoading, error: healthError, refetch: refetchHealth } = useHealth()
  const { data: models, isLoading: modelsLoading, error: modelsError, refetch: refetchModels } = useModels()

  const hasError = healthError || modelsError

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search className="me-auto" />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className="mb-6 flex items-center justify-between space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          {hasError && (
            <Button variant="outline" size="sm" onClick={() => { refetchHealth(); refetchModels(); }}>
              <RotateCcw className="me-2 h-3.5 w-3.5" />
              Retry
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* System Status */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              System Status
            </h2>
            {healthLoading ? (
              <div className="flex flex-wrap gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-9 w-36 rounded-lg" />
                ))}
              </div>
            ) : healthError ? (
              <StatusBadge status="disconnected" label="Backend unreachable" />
            ) : health ? (
              <div className="flex flex-wrap gap-3">
                <StatusBadge
                  status={health.status === 'healthy' ? 'connected' : 'warning'}
                  label={`Backend ${health.version}`}
                />
                <StatusBadge
                  status="connected"
                  label={`${health.provider} • ${health.model}`}
                />
                <StatusBadge
                  status={modelsLoading || modelsError ? 'warning' : 'connected'}
                  label={
                    modelsLoading
                      ? 'Loading models...'
                      : modelsError
                        ? 'Models unavailable'
                        : models
                          ? `Models: ${models.count} available`
                          : 'Models: 0 available'
                  }
                />
                <StatusBadge status="disconnected" label="Database" />
              </div>
            ) : null}
          </section>

          {/* Active Model + Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              {modelsLoading || healthLoading ? (
                <div className="flex items-center gap-4 p-6">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ) : health ? (
                <ModelCard
                  name={health.model}
                  provider={health.provider}
                  status={healthError ? 'unavailable' : 'loaded'}
                  icon={<Cpu className="h-8 w-8" />}
                />
              ) : (
                <ModelCard
                  name="Unavailable"
                  provider="Unknown"
                  status="unavailable"
                  icon={<Cpu className="h-8 w-8" />}
                />
              )}
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button asChild variant="default" className="w-full justify-start">
                  <Link to="/ai-chat">
                    <MessageSquare className="me-2 h-4 w-4" />
                    New Chat
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/settings">
                    <Server className="me-2 h-4 w-4" />
                    Configure Models
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Cards — live data from APIs */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Platform
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Installed Models"
                value={modelsLoading ? <Skeleton className="h-8 w-16" /> : (models?.count ?? '—')}
                description={
                  modelsError ? 'Unable to fetch' : (models?.models[0]?.name ? `Default: ${models.models[0].name}` : 'No models detected')
                }
                icon={<Cpu />}
              />
              <StatCard
                title="Current Provider"
                value={healthLoading ? <Skeleton className="h-8 w-20" /> : (health?.provider ? health.provider.charAt(0).toUpperCase() + health.provider.slice(1) : '—')}
                description={healthError ? 'Backend unreachable' : (health?.model ?? 'No model configured')}
                icon={<Server />}
              />
              <StatCard
                title="Backend Version"
                value={healthLoading ? <Skeleton className="h-8 w-16" /> : (health?.version ?? '—')}
                description={
                  healthError
                    ? 'Backend unreachable'
                    : health
                      ? `Last checked: ${new Date(health.timestamp).toLocaleTimeString()}`
                      : 'Unavailable'
                }
                icon={<MessageSquare />}
              />
            </div>
          </section>

          {/* Recent Conversations */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Recent Conversations
            </h2>
            <Card>
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
                <CardDescription>
                  Your recent AI chat sessions will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start a new chat to see your history here.
                  </p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link to="/ai-chat">
                      <MessageSquare className="me-2 h-4 w-4" />
                      Open AI Chat
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </Main>
    </>
  )
}
