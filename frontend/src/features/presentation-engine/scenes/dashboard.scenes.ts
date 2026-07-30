import type { SceneDefinition } from '../types/scene'

export const dashboardScenes: SceneDefinition[] = [
  {
    id: 'dashboard.welcome',
    module: 'dashboard',
    title: 'Welcome to EYAN Studio',
    route: '/app',
    duration: 5000,
    narration: {
      text: 'This is your EYAN Studio dashboard — a real-time view of your models, providers, and recent activity.',
    },
    camera: { target: 'dashboard.system-status', behavior: 'smooth' },
    highlight: {
      target: 'dashboard.system-status',
      style: 'spotlight',
      callout: { text: 'Live backend and model health, checked in real time.' },
    },
  },
  {
    id: 'dashboard.quick-actions',
    module: 'dashboard',
    title: 'Jump right in',
    route: '/app',
    duration: 4000,
    narration: {
      text: 'Quick actions let you start a new chat or configure your models without leaving the dashboard.',
    },
    camera: { target: 'dashboard.quick-actions' },
    highlight: {
      target: 'dashboard.quick-actions',
      style: 'glow',
      callout: { text: 'Start a chat or configure providers in one click.' },
    },
  },
  {
    id: 'dashboard.platform-stats',
    module: 'dashboard',
    title: 'Platform at a glance',
    route: '/app',
    duration: 4000,
    narration: {
      text: 'Installed models, the active provider, and backend version are always visible here.',
    },
    camera: { target: 'dashboard.platform-stats' },
    highlight: { target: 'dashboard.platform-stats', style: 'spotlight' },
  },
]
