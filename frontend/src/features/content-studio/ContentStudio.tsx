import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ContentPipeline } from './components/ContentPipeline'
import { NewProjectDialog } from './components/NewProjectDialog'
import { QuickActions } from './components/QuickActions'
import { RecentProjects } from './components/RecentProjects'

// Quick Actions cards are not yet implemented; flip this once they are wired up.
const isQuickActionsEnabled = false

export function ContentStudio() {
  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-8'>
          <PageHeader
            title='Content Studio'
            description='Create blogs, social media, scripts and videos from one place.'
            breadcrumbs={[{ label: 'Content Studio' }]}
            actions={<NewProjectDialog />}
          />
        </div>

        <div className='space-y-6'>
          {isQuickActionsEnabled && <QuickActions />}

          <RecentProjects />

          <ContentPipeline />
        </div>
      </Main>
    </>
  )
}
