import { createFileRoute } from '@tanstack/react-router'
import { ContactPage } from '@/features/lead-capture/pages/contact-page'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})
