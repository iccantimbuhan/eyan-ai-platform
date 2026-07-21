import { login } from "../api/auth-api";
import { useAuthStore } from "@/stores/auth-store";

export function useLogin() {
  const { auth } = useAuthStore();

  return async (email: string, password: string) => {
    const result = await login({
      email,
      password,
    });

    console.log("========== LOGIN RESPONSE ==========");
    console.log(result);
    console.log("Access Token:", result.tokens?.accessToken);
    console.log("Refresh Token:", result.tokens?.refreshToken);
    console.log("====================================");

    auth.setTokens(
      result.tokens.accessToken,
      result.tokens.refreshToken
    );

    auth.setUser(result.user);

    return result.user;
  };
}
