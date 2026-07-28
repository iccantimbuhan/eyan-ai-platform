import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { refreshAccessToken } from '@/features/auth/utils/refresh-token'

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

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
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

        window.location.href = '/sign-in'

        return Promise.reject(refreshError)
      }
    }

    logAxiosError(error)
    return Promise.reject(error)
  }
)
