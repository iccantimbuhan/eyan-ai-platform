export type PermissionFeature = { label: string; permissions: string[] }
export type PermissionCategory = {
  label: string
  features: PermissionFeature[]
}

// Extend this registry for future feature pages. Permission keys stay opaque to the UI.
export const permissionCategories: PermissionCategory[] = [
  {
    label: 'Platform',
    features: [
      { label: 'Dashboard', permissions: ['dashboard'] },
      { label: 'AI Chat', permissions: ['chat'] },
      { label: 'Models', permissions: ['models'] },
      { label: 'Conversations', permissions: ['conversations'] },
      { label: 'Presentation Engine', permissions: ['presentation-engine'] },
    ],
  },
  {
    label: 'Sales',
    features: [{ label: 'CRM', permissions: ['crm'] }],
  },
  {
    label: 'Administration',
    features: [
      { label: 'Users', permissions: ['users'] },
      { label: 'Roles', permissions: ['roles'] },
    ],
  },
  {
    label: 'AI',
    features: [
      { label: 'Providers', permissions: ['providers'] },
      { label: 'Prompt Templates', permissions: ['prompt-templates'] },
      { label: 'Knowledge Base', permissions: ['knowledge-base'] },
      { label: 'Agents', permissions: ['agents'] },
      { label: 'Workflows', permissions: ['workflows'] },
    ],
  },
  // AI Core Foundation (Phase 1) — registered here from day one, unlike the
  // three gaps below that were only discovered and fixed alongside it.
  {
    label: 'AI Core',
    features: [
      { label: 'AI Core', permissions: ['aicore'] },
      { label: 'AI Core Admin', permissions: ['aicoreadmin'] },
    ],
  },
  {
    label: 'Automation',
    features: [
      { label: 'Automation', permissions: ['automation'] },
      { label: 'Automation Credentials', permissions: ['automationcredentials'] },
    ],
  },
  {
    label: 'Finance',
    features: [{ label: 'Finance', permissions: ['finance'] }],
  },
  {
    label: 'System',
    features: [
      { label: 'Settings', permissions: ['settings'] },
      { label: 'API Keys', permissions: ['apikeys'] },
      { label: 'Analytics', permissions: ['analytics'] },
      { label: 'Audit Logs', permissions: ['auditlogs'] },
    ],
  },
]
