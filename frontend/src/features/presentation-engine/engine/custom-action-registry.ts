export interface CustomActionContext {
  sceneId: string
  signal: AbortSignal
}

export type CustomActionHandler = (
  payload: Record<string, unknown> | undefined,
  ctx: CustomActionContext
) => Promise<void>

const registry = new Map<string, CustomActionHandler>()

/**
 * The engine's single pressure valve: a module registers a handler for a
 * `custom` scene action here (in that module's own scene file), keeping
 * the engine's core action vocabulary (navigate/wait/highlight/camera/
 * narrate) fixed forever while still letting a genuinely unusual need be
 * satisfied by module-owned code.
 */
export function registerCustomAction(type: string, handler: CustomActionHandler): void {
  registry.set(type, handler)
}

export async function runCustomAction(
  type: string,
  payload: Record<string, unknown> | undefined,
  ctx: CustomActionContext
): Promise<void> {
  const handler = registry.get(type)
  if (!handler) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[presentation-engine] No custom action handler registered for "${type}"`)
    }
    return
  }
  await handler(payload, ctx)
}
