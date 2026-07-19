import axios, { AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;
const NGROK_SKIP_HEADER = "ngrok-skip-browser-warning";

function headersToJSON(headers: unknown) {
  if (!headers || typeof headers !== "object") return headers;
  if ("toJSON" in headers && typeof headers.toJSON === "function") {
    return headers.toJSON();
  }
  return { ...headers };
}

function logAxiosError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    console.error("[api] Non-Axios error", error);
    return;
  }

  console.error("[api] Axios error", {
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
    requestHeaders: headersToJSON(error.config?.headers),
    responseHeaders: headersToJSON(error.response?.headers),
    responseData: error.response?.data,
    stack: error.stack,
  });
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  withCredentials: false,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    [NGROK_SKIP_HEADER]: "true",
  },
});

api.interceptors.request.use((config) => {
  if (!config.baseURL) {
    console.error("[api] Missing VITE_API_URL", { API_BASE_URL });
  }

  config.headers.set("Accept", "application/json");
  config.headers.set("Content-Type", "application/json");
  config.headers.set(NGROK_SKIP_HEADER, "true");

  console.info("[api] Request", {
    method: config.method?.toUpperCase(),
    finalUrl: axios.getUri(config),
    baseURL: config.baseURL,
    url: config.url,
    headers: headersToJSON(config.headers),
  });

  return config;
});

api.interceptors.response.use(
  (response) => {
    console.info("[api] Response", {
      status: response.status,
      statusText: response.statusText,
      finalUrl: response.config ? axios.getUri(response.config) : undefined,
      headers: headersToJSON(response.headers),
      data: response.data,
    });
    return response;
  },
  (error) => {
    logAxiosError(error);
    return Promise.reject(error);
  }
);
