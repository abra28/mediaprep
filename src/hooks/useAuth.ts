import { trpc } from "@/providers/trpc";
import { useCallback, useMemo } from "react";

export type LocalUser = {
  id: number;
  name: string | null;
  email: string | null;
  avatar?: string | null;
  role: string;
  teamRole: string | null;
};

export function useAuth() {
  const utils = trpc.useUtils();

  // Primary: localAuth.me is a public query that reads ctx.user (works for both OAuth and local)
  const {
    data: meData,
    isLoading: meLoading,
    error: meError,
  } = trpc.localAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  // Fallback: check localStorage directly if query hasn't returned yet
  const localUserStr =
    typeof window !== "undefined"
      ? localStorage.getItem("localUser")
      : null;

  const localUser: LocalUser | null = useMemo(() => {
    if (meData) {
      return {
        id: meData.id,
        name: meData.name,
        email: meData.email,
        avatar: meData.avatar ?? null,
        role: meData.role,
        teamRole: meData.teamRole ?? null,
      };
    }
    if (localUserStr) {
      try {
        return JSON.parse(localUserStr) as LocalUser;
      } catch {
        return null;
      }
    }
    return null;
  }, [meData, localUserStr]);

  const isAdmin =
    localUser?.role === "admin" || localUser?.teamRole === "team-lead";

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
    onSettled: () => {
      localStorage.removeItem("localUser");
      window.location.reload();
    },
  });

  const logout = useCallback(() => {
    localStorage.removeItem("localUser");
    logoutMutation.mutate();
  }, [logoutMutation]);

  const isLoading = meLoading;

  // If the query completed and returned null, AND there's no localStorage, user is not authenticated
  // If the query is still loading, show loading state
  const isAuthenticated = useMemo(() => {
    if (meLoading) return false;
    if (meData) return true;
    if (meError && localUserStr) {
      // Query errored but we have localStorage — trust localStorage
      try {
        const parsed = JSON.parse(localUserStr);
        return !!parsed && !!parsed.id;
      } catch {
        return false;
      }
    }
    return !!localUserStr;
  }, [meLoading, meData, meError, localUserStr]);

  return useMemo(
    () => ({
      user: localUser,
      isAuthenticated,
      isLoading,
      isAdmin,
      logout,
    }),
    [localUser, isAuthenticated, isLoading, isAdmin, logout]
  );
}
