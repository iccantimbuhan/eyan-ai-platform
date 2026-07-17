import { Bot, Cloud, Key, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProviderCard, type ProviderInfo } from './components/ProviderCard'
import { useProviders } from './hooks/useProviders'

const ALL_PROVIDERS: Omit<ProviderInfo, 'status' | 'endpoint' | 'currentModel' | 'installedModels' | 'version'>[] = [
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run open-source models locally on your machine.',
    icon: <Bot className="h-5 w-5" />,
  },
  {
    id: 'lm-studio',
    name: 'LM Studio',
    description: 'Local inference with a user-friendly desktop app.',
    icon: <Bot className="h-5 w-5" />,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, and more via OpenAI API.',
    icon: <Cloud className="h-5 w-5" />,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models for advanced reasoning and coding.',
    icon: <Cloud className="h-5 w-5" />,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini Pro and Ultra models from Google.',
    icon: <Cloud className="h-5 w-5" />,
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference with LPU technology.',
    icon: <Key className="h-5 w-5" />,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified API for 100+ models across providers.',
    icon: <Cloud className="h-5 w-5" />,
  },
  {
    id: 'vllm',
    name: 'vLLM',
    description: 'High-throughput serving for production workloads.',
    icon: <Key className="h-5 w-5" />,
  },
]

export function Providers() {
  const { ollama, isLoading, error, refetch } = useProviders()

  const providers: ProviderInfo[] = ALL_PROVIDERS.map((p) => {
    if (p.id === 'ollama') {
      return {
        ...p,
        status: isLoading ? 'disconnected' : ollama.status,
        endpoint: ollama.endpoint,
        currentModel: ollama.currentModel,
        installedModels: ollama.installedModels,
        version: ollama.version,
      }
    }
    return {
      ...p,
      status: 'coming-soon' as const,
    }
  })

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
            <h1 className="text-2xl font-bold tracking-tight">AI Providers</h1>
            <p className="text-sm text-muted-foreground">
              Manage connections to AI inference providers.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            Refresh All
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Some providers could not be reached. Ensure the backend is running.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-3 w-full" />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-8 flex-1" />
                    ))}
                  </div>
                </div>
              ))
            : providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onRefresh={provider.id === 'ollama' ? refetch : undefined}
                />
              ))}
        </div>
      </Main>
    </>
  )
}
