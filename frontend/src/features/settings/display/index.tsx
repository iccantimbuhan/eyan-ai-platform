import { ContentSection } from '../components/content-section'
import { DisplayForm } from './display-form'

export function SettingsDisplay() {
  return (
    <ContentSection
      title='Display'
      desc="Turn items on or off to control what's displayed in the app."
      breadcrumbs={[
        { label: 'Settings', to: '/app/settings' },
        { label: 'Display' },
      ]}
    >
      <DisplayForm />
    </ContentSection>
  )
}
