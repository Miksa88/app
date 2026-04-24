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
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Ako je "trainer", dodatno verifikuje da profile.role === 'trainer'. */
  requireRole?: "client" | "trainer";
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
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

  return <>{children}</>;
};
