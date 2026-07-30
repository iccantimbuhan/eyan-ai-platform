import {
  BarChart3,
  Bot,
  LayoutDashboard,
  MessageSquare,
  Boxes,
  BookOpen,
  FolderOpen,
  Palette,
  UserCog,
  Users,
  Monitor,
  Bell,
  Cpu,
  ShieldCheck,
  Plug,
  KeyRound,
  Server,
  HeartPulse,
  ScrollText,
  Wallet,
  Presentation,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Ian',
    email: 'ian@localhost',
    avatar: '/avatars/placeholder.jpg',
  },

  teams: [
    {
      name: 'EYAN Studio',
      logo: Bot,
      plan: 'Self-Hosted AI',
    },
  ],

  navGroups: [
    {
      title: 'Platform',
      items: [
        {
          title: 'Dashboard',
          url: '/app',
          icon: LayoutDashboard,
          permission: 'dashboard',
        },
        {
          title: 'Presentation Engine',
          url: '/app/presentation-engine',
          icon: Presentation,
          permission: 'presentation-engine',
        },
      ],
    },

    {
      title: 'AI Studio',
      items: [
        {
          title: 'AI Chat',
          url: '/app/ai-chat',
          icon: MessageSquare,
          permission: 'chat',
        },
        {
          title: 'Models',
          url: '/app/models',
          icon: Boxes,
          permission: 'models',
        },
      ],
    },

    {
      title: 'Content Studio',
      items: [
        {
          title: 'Content Studio',
          url: '/app/content-studio',
          icon: FolderOpen,
        },
        {
          title: 'Production Dashboard',
          url: '/app/content-studio/dashboard',
          icon: BarChart3,
        },
        {
          title: 'Prompt Library',
          url: '/app/content-studio/prompt-library',
          icon: BookOpen,
        },
      ],
    },

    {
      title: 'Finance',
      items: [
        {
          title: 'Finance Management',
          icon: Wallet,
          permission: 'finance',
          items: [
            { title: 'Dashboard', url: '/app/finance' },
            { title: 'Expenses', url: '/app/finance/expenses' },
          ],
        },
      ],
    },

    {
      title: 'Automation',
      items: [
        {
          title: 'Providers',
          url: '/app/automation/providers',
          icon: Plug,
          permission: 'automation',
        },
        {
          title: 'Connections',
          url: '/app/automation/connections',
          icon: KeyRound,
          permission: 'automation',
        },
        {
          title: 'MCP Servers',
          url: '/app/automation/mcp-servers',
          icon: Server,
          permission: 'automation',
        },
        {
          title: 'Health',
          url: '/app/automation/health',
          icon: HeartPulse,
          permission: 'automation',
        },
        {
          title: 'Audit Logs',
          url: '/app/automation/audit-logs',
          icon: ScrollText,
          permission: 'auditlogs',
        },
      ],
    },

    {
      title: 'Administration',
      items: [
        {
          title: 'Users',
          url: '/app/users',
          icon: Users,
          permission: 'users',
        },
        {
          title: 'Roles',
          url: '/app/roles',
          icon: ShieldCheck,
          permission: 'roles',
        },
      ],
    },

    {
      title: 'Settings',
      items: [
        {
          title: 'Profile',
          url: '/app/settings',
          icon: UserCog,
          permission: 'settings',
        },
        {
          title: 'Appearance',
          url: '/app/settings/appearance',
          icon: Palette,
        },
        {
          title: 'Display',
          url: '/app/settings/display',
          icon: Monitor,
        },
        {
          title: 'Notifications',
          url: '/app/settings/notifications',
          icon: Bell,
          permission: 'settings',
        },
        {
          title: 'AI Providers',
          url: '/app/settings/providers',
          icon: Cpu,
          permission: 'providers',
        },
      ],
    },
  ],
}
