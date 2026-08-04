/**
 * OAuth providers are wired up in the UI but not yet implemented end-to-end.
 * List a provider here once its backend flow actually works to reveal its
 * button on the sign-in/sign-up screens.
 */
export const ENABLED_OAUTH_PROVIDERS: readonly string[] = []

export const isAnyOAuthProviderEnabled = ENABLED_OAUTH_PROVIDERS.length > 0
