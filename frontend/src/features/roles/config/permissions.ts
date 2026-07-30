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
