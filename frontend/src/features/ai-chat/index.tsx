import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useIsMobile } from '@/hooks/use-mobile'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ChatWindow } from './components/ChatWindow'
import { useAiChatStore } from './store'

export function AiChat() {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    addConversation,
    deleteConversation,
  } = useAiChatStore()

  const isMobile = useIsMobile()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Auto-create first conversation if none exist
  useEffect(() => {
    if (conversations.length === 0) {
      addConversation()
    }
  }, [conversations.length, addConversation])

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id)
  }

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteConversation(deleteId)
      setDeleteId(null)
    }
  }

  const sidebarContent = (
    <div className="flex h-full min-h-0 w-full flex-col sm:w-64 lg:w-72 2xl:w-80">
      {/* Sidebar header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold">AI Chat</h1>
          {conversations.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {conversations.length}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            addConversation()
            if (isMobile) setMobileOpen(false)
          }}
          className="gap-1"
        >
          <Plus size={14} />
          New
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.map((convo) => {
            const lastActivity = convo.updatedAt
              ? formatRelativeTime(convo.updatedAt)
              : ''
            return (
              <div
                key={convo.id}
                className="group relative mb-0.5"
              >
                <button
                  type="button"
                  className={cn(
                    'w-full rounded-lg px-3 py-2.5 text-start text-sm transition-colors hover:bg-accent',
                    activeConversationId === convo.id &&
                      'bg-accent font-medium'
                  )}
                  onClick={() => {
                    setActiveConversation(convo.id)
                    if (isMobile) setMobileOpen(false)
                  }}
                  aria-label={`Open conversation: ${convo.title}`}
                >
                  <p className="truncate">{convo.title}</p>
                  <p className="mt-0.5 flex items-center justify-between truncate text-xs text-muted-foreground">
                    <span>
                      {convo.messages.length} message
                      {convo.messages.length !== 1 ? 's' : ''}
                    </span>
                    {lastActivity && <span>{lastActivity}</span>}
                  </p>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 hidden -translate-y-1/2 size-6 group-hover:flex"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteRequest(convo.id)
                  }}
                  aria-label={`Delete conversation: ${convo.title}`}
                >
                  <Trash2 size={13} className="text-muted-foreground" />
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )

  return (
    <>
      <Header>
        {/* Mobile menu trigger */}
        {isMobile && (
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open conversations</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        )}
        <Search className="me-auto" />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed fluid>
        <section className="flex h-full min-h-0 overflow-hidden gap-0">
          {/* Desktop sidebar */}
          {!isMobile && (
            <aside className="flex min-h-0 w-full flex-col border-r sm:w-64 lg:w-72 2xl:w-80">
              {sidebarContent}
            </aside>
          )}

          {/* Chat panel */}
          <div className="flex min-h-0 w-0 flex-1 flex-col">
            <ChatWindow />
          </div>
        </section>
      </Main>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete Conversation"
        desc="This will permanently delete this conversation and all its messages. This action cannot be undone."
        confirmText="Delete"
        destructive
        handleConfirm={handleDeleteConfirm}
      />
    </>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24) return `${diffHr}h`
  if (diffDay < 7) return `${diffDay}d`
  return then.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
