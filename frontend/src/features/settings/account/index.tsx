import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  return (
    <ContentSection
      title='Account'
      desc='Update your account settings. Set your preferred language and
          timezone.'
      breadcrumbs={[
        { label: 'Settings', to: '/app/settings' },
        { label: 'Account' },
      ]}
    >
      <AccountForm />
    </ContentSection>
  )
}
