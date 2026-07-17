import { ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ModelCard } from './components/ModelCard'
import { useModelsList } from './hooks/useModelsList'

type SortKey = 'name' | 'size' | 'parameters' | 'family'

export function Models() {
  const {
    models,
    totalCount,
    isLoading,
    error,
    refetch,
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
  } = useModelsList()

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const SortIndicator = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1.5 h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1.5 h-3.5 w-3.5" />
    )
  }

  return (
    <>
      <Header>
        <Search className="me-auto" />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className="mb-6 flex items-center justify-between space-y-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Models</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Loading installed models...'
                : error
                  ? 'Unable to connect to backend'
                  : `${totalCount} model${totalCount !== 1 ? 's' : ''} installed`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled>
              <Download className="me-2 h-4 w-4" />
              Download Model
            </Button>
            <Button variant="outline" size="icon" onClick={refetch}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search by name or family..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          {/* Sort controls */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort by:</span>
            {(['name', 'family', 'size', 'parameters'] as SortKey[]).map((k) => (
              <Button
                key={k}
                variant={sortKey === k ? 'default' : 'outline'}
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs capitalize"
                onClick={() => handleSort(k)}
              >
                {k}
                <SortIndicator k={k} />
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-1 h-4 w-20" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <CardTitle className="text-lg">Unable to load models</CardTitle>
              <CardDescription className="mt-2">
                {error}. Ensure the backend is running and try again.
              </CardDescription>
              <Button className="mt-4" onClick={refetch}>
                <RefreshCw className="me-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : models.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <RefreshCw className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <CardTitle className="text-lg">No models installed</CardTitle>
              <CardDescription className="mt-2">
                {search
                  ? 'No models match your search.'
                  : 'Pull a model using Ollama to get started.'}
              </CardDescription>
              <Button className="mt-4" variant="outline" onClick={refetch}>
                <RefreshCw className="me-2 h-4 w-4" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {models.map((model) => (
              <ModelCard key={model.name} model={model} />
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
