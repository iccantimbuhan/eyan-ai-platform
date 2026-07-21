import { refresh } from "../api/auth-api";
import { useAuthStore } from "@/stores/auth-store";

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const { auth } = useAuthStore.getState();

    if (!auth.refreshToken) {
      throw new Error("Missing refresh token.");
    }

    const result = await refresh(auth.refreshToken);

    auth.setTokens(
      result.tokens.accessToken,
      result.tokens.refreshToken
    );

    return result.tokens.accessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}
