import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { refreshAccessToken } from '@/features/auth/utils/refresh-token'
import { getRouterInstance } from '@/lib/router-instance'

const API_BASE_URL = import.meta.env.VITE_API_URL
const NGROK_SKIP_HEADER = 'ngrok-skip-browser-warning'

const IS_DEV = import.meta.env.DEV

function sanitizeHeaders(headers: unknown) {
  const json = headersToJSON(headers)

  if (!json || typeof json !== 'object') {
    return json
  }

  const sanitized = { ...(json as Record<string, unknown>) }

  for (const key of Object.keys(sanitized)) {
    if (key.toLowerCase() === 'authorization') {
      sanitized[key] = 'Bearer ********'
    }
  }

  return sanitized
}

function headersToJSON(headers: unknown) {
  if (!headers || typeof headers !== 'object') return headers
  if ('toJSON' in headers && typeof headers.toJSON === 'function') {
    return headers.toJSON()
  }
  return { ...headers }
}

function logAxiosError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    console.error('[api] Non-Axios error', error)
    return
  }

  console.error('[api] Axios error', {
    message: error.message,
    code: error.code,
    status: error.response?.status,
    finalUrl: error.config
      ? axios.getUri({
          baseURL: error.config.baseURL,
          url: error.config.url,
          params: error.config.params,
        })
      : undefined,
    requestHeaders: sanitizeHeaders(error.config?.headers),
    responseHeaders: sanitizeHeaders(error.response?.headers),
    responseData: error.response?.data,
    stack: error.stack,
  })
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    [NGROK_SKIP_HEADER]: 'true',
  },
})

api.interceptors.request.use((config) => {
  if (!config.baseURL && IS_DEV) {
    console.error('[api] Missing VITE_API_URL', {
      API_BASE_URL,
    })
  }

  const accessToken = useAuthStore.getState().auth.accessToken

  config.headers.set('Accept', 'application/json')

  // A FormData body (video source uploads — see video-sources.api.ts) must
  // get the multipart boundary Content-Type axios derives on its own; the
  // 'application/json' default this instance was created with (see
  // axios.create() below) has to be removed, not just left unset, or it
  // would silently corrupt every such request. Every other request in
  // this app sends a JSON body, so this is the sole exception.
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  } else {
    config.headers.set('Content-Type', 'application/json')
  }

  config.headers.set(NGROK_SKIP_HEADER, 'true')

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  if (IS_DEV) {
    console.info('[api] Request', {
      method: config.method?.toUpperCase(),
      finalUrl: axios.getUri(config),
      baseURL: config.baseURL,
      url: config.url,
      headers: sanitizeHeaders(config.headers),
    })
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // The refresh endpoint's own 401 must never re-enter this same retry
    // path: refreshAccessToken() posts to /auth/refresh through this exact
    // `api` instance, so without this exclusion a 401 there would recurse
    // into refreshAccessToken() again — awaiting the very refreshPromise
    // that is currently in the process of rejecting, which never settles
    // and hangs "Restoring session..." forever instead of ever reaching the
    // redirect below (found via browser verification of an expired-refresh-
    // token scenario).
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh')

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshCall
    ) {
      originalRequest._retry = true

      try {
        const token = await refreshAccessToken()

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${token}`,
        }

        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().auth.reset()

        // Guards against more than one 401 arriving around the same time
        // (e.g. two requests in flight when the token expires) each
        // independently navigating to /sign-in and nesting the `redirect`
        // search param inside itself.
        if (!window.location.pathname.startsWith('/sign-in')) {
          const router = getRouterInstance()
          if (router) {
            router.navigate({
              to: '/sign-in',
              search: { redirect: window.location.href },
            })
          } else {
            // Router not created yet (should not happen in practice — kept
            // as a defensive fallback rather than silently doing nothing).
            window.location.href = '/sign-in'
          }
        }

        return Promise.reject(refreshError)
      }
    }

    logAxiosError(error)
    return Promise.reject(error)
  }
)
