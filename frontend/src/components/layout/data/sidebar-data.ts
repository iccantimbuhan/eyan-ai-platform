import {
  BarChart3,
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
  Contact,
  BrainCircuit,
  Layers,
  FlaskConical,
  DollarSign,
  UtensilsCrossed,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Ian',
    email: 'ian@localhost',
    avatar: '/avatars/placeholder.jpg',
  },

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
      // Sprint 0 (ADR-0025/ADR-0026) — Restaurant Operations, the
      // platform's first commercial business module. Gated by both the
      // "restaurant" RBAC permission and the "restaurant" Module Registry
      // entry (moduleKey) — an Organization must have the module enabled
      // *and* the user must hold the permission. Sprint 1.1 adds the
      // master-data CRUD screens (Restaurants/Branches/Menu Categories/
      // Menu Items) as sub-items; the top-level Dashboard entry is still
      // the Sprint 0 placeholder.
      title: 'Restaurant Operations',
      items: [
        {
          title: 'Restaurant Operations',
          icon: UtensilsCrossed,
          permission: 'restaurant',
          moduleKey: 'restaurant',
          items: [
            { title: 'Dashboard', url: '/app/restaurant' },
            { title: 'Restaurants', url: '/app/restaurant/restaurants' },
            { title: 'Branches', url: '/app/restaurant/branches' },
            { title: 'Menu Categories', url: '/app/restaurant/menu-categories' },
            { title: 'Menu Items', url: '/app/restaurant/menu-items' },
            { title: 'Ingredient Categories', url: '/app/restaurant/ingredient-categories' },
            { title: 'Ingredients', url: '/app/restaurant/ingredients' },
            { title: 'Suppliers', url: '/app/restaurant/suppliers' },
            { title: 'Units', url: '/app/restaurant/units' },
            { title: 'Recipes', url: '/app/restaurant/recipes' },
            { title: 'Staff', url: '/app/restaurant/staff' },
          ],
        },
      ],
    },

    {
      // First pillar of the longer-term Sales Workspace vision (TDD §9
      // Phase 0.5 review) — Leads today, Contacts/Companies/Deals/Tasks/
      // Activities/Reports as later pillars under this same group.
      title: 'Sales',
      items: [
        {
          title: 'CRM',
          icon: Contact,
          permission: 'crm',
          items: [
            { title: 'Dashboard', url: '/app/crm' },
            { title: 'Leads', url: '/app/crm/leads' },
          ],
        },
      ],
    },

    {
      title: 'AI Core',
      items: [
        {
          title: 'AI Core Dashboard',
          url: '/app/ai-core',
          icon: BrainCircuit,
          permission: 'aicore',
        },
        {
          title: 'Capabilities',
          url: '/app/ai-core/capabilities',
          icon: Boxes,
          permission: 'aicore',
        },
        {
          title: 'Brains',
          url: '/app/ai-core/brains',
          icon: Layers,
          permission: 'aicore',
        },
        {
          title: 'Providers',
          url: '/app/ai-core/providers',
          icon: Plug,
          permission: 'aicore',
        },
        {
          title: 'Models',
          url: '/app/ai-core/models',
          icon: Cpu,
          permission: 'aicore',
        },
        {
          title: 'Playground',
          url: '/app/ai-core/playground',
          icon: FlaskConical,
          permission: 'aicoreadmin',
        },
        {
          title: 'Usage',
          url: '/app/ai-core/usage',
          icon: BarChart3,
          permission: 'aicore',
        },
        {
          title: 'Costs',
          url: '/app/ai-core/costs',
          icon: DollarSign,
          permission: 'aicore',
        },
        {
          title: 'Health',
          url: '/app/ai-core/health',
          icon: HeartPulse,
          permission: 'aicore',
        },
        {
          title: 'Audit Logs',
          url: '/app/ai-core/audit',
          icon: ScrollText,
          permission: 'auditlogs',
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
