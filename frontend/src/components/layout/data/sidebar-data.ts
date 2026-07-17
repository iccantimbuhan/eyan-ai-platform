import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Boxes,
  Palette,
  UserCog,
  Users,
  Monitor,
  Bell,
  Cpu,
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
      name: 'Open Source AI Platform',
      logo: Bot,
      plan: 'Local AI',
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
        },
        {
          title: 'AI Chat',
          url: '/ai-chat',
          icon: MessageSquare,
        },
        {
          title: 'Models',
          url: '/models',
          icon: Boxes,
        },
        {
          title: 'Users',
          url: '/users',
          icon: Users,
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
        },
        {
          title: 'AI Providers',
          url: '/settings/providers',
          icon: Cpu,
        },
      ],
    },
  ],
}