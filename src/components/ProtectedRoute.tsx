// ============================================================================
// ProtectedRoute — auth guard
// ============================================================================
//
// Wrapper koji blokira rendere ako klijentkinja nije ulogovana.
//   - isLoading: prikazuje placeholder (spinner ili aria-busy)
//   - !isAuthenticated: redirect na "/" (Login)
//   - authenticated: prosleđuje children
//
// Koristi se u App.tsx:
//   <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
// ============================================================================

import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Ako je postavljeno, dodatno verifikuje da profile.role === requireRole. */
  requireRole?: "client" | "trainer";
}

export const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, clientId } = useAuth();

  const { data: role, isLoading: roleLoading } = useQuery<string | null, Error>({
    queryKey: ["profile", "role", clientId ?? "anon"],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", clientId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.role ?? null;
    },
    enabled: !!clientId && !!requireRole,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || (requireRole && roleLoading)) {
    return (
      <div
        className="min-h-screen bg-background-secondary flex items-center justify-center"
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requireRole && role && role !== requireRole) {
    // Redirect na role-specific home (trainer → /trainer, client → /home)
    return <Navigate to={role === "trainer" ? "/trainer" : "/home"} replace />;
  }

  return <>{children}</>;
};
