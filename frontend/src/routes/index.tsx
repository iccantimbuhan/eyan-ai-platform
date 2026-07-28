import { createFileRoute } from '@tanstack/react-router'
import { PortfolioLanding } from '@/features/portfolio'

export const Route = createFileRoute('/')({
  component: PortfolioLanding,
})
