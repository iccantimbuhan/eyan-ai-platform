import { createFileRoute } from '@tanstack/react-router'
import { SettingsNotifications } from '@/features/settings/notifications'

export const Route = createFileRoute('/app/_authenticated/settings/notifications')({
  component: SettingsNotifications,
})
