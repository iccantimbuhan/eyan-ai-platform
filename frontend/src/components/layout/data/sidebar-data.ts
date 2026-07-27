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
          url: '/',
          icon: LayoutDashboard,
          permission: 'dashboard',
        },
      ],
    },

    {
      title: 'AI Studio',
      items: [
        {
          title: 'AI Chat',
          url: '/ai-chat',
          icon: MessageSquare,
          permission: 'chat',
        },
        {
          title: 'Models',
          url: '/models',
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
          url: '/content-studio',
          icon: FolderOpen,
        },
        {
          title: 'Production Dashboard',
          url: '/content-studio/dashboard',
          icon: BarChart3,
        },
        {
          title: 'Prompt Library',
          url: '/content-studio/prompt-library',
          icon: BookOpen,
        },
      ],
    },

    {
      title: 'Automation',
      items: [
        {
          title: 'Providers',
          url: '/automation/providers',
          icon: Plug,
          permission: 'automation',
        },
        {
          title: 'Connections',
          url: '/automation/connections',
          icon: KeyRound,
          permission: 'automation',
        },
        {
          title: 'MCP Servers',
          url: '/automation/mcp-servers',
          icon: Server,
          permission: 'automation',
        },
        {
          title: 'Health',
          url: '/automation/health',
          icon: HeartPulse,
          permission: 'automation',
        },
        {
          title: 'Audit Logs',
          url: '/automation/audit-logs',
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
          url: '/users',
          icon: Users,
          permission: 'users',
        },
        {
          title: 'Roles',
          url: '/roles',
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
          url: '/settings',
          icon: UserCog,
          permission: 'settings',
        },
        {
          title: 'Appearance',
          url: '/settings/appearance',
          icon: Palette,
        },
        {
          title: 'Display',
          url: '/settings/display',
          icon: Monitor,
        },
        {
          title: 'Notifications',
          url: '/settings/notifications',
          icon: Bell,
          permission: 'settings',
        },
        {
          title: 'AI Providers',
          url: '/settings/providers',
          icon: Cpu,
          permission: 'providers',
        },
      ],
    },
  ],
}
