import { ReactNode, useEffect, useState } from "react";
import { me } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/stores/auth-store";

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const { auth } = useAuthStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (!auth.accessToken) {
        setLoading(false);
        return;
      }

      try {
        const user = await me();

        auth.setUser(user);
      } catch {
        auth.reset();
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Restoring session...
      </div>
    );
  }

  return children;
}
