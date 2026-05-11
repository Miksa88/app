// ============================================================================
// AuthContext — auth state provider
// ============================================================================
//
// Dva moda:
//
//   1. **Mock auth (dev)** — VITE_DEV_MOCK_AUTH="true". Vraca fiksni
//      TEST_USER_ID iz .env. Klijentkinja je odmah "ulogovana" sa
//      pre-seed-ovanim auth.users redom. Idealno za UI razvoj — bez
//      prolaza kroz signup/login svaki put.
//
//   2. **Pravi auth (prod)** — VITE_DEV_MOCK_AUTH != "true". Subscribe-uje
//      na supabase.auth.onAuthStateChange. Klijentkinja mora pravo da se
//      uloguje (Login.tsx + SignUpSheet.tsx + Supabase OAuth).
//
// API:
//   const { clientId, isLoading, isAuthenticated, signOut } = useAuth();
//
// Kad signup postane realan u produkciji, samo postavi VITE_DEV_MOCK_AUTH=false
// — niko od UI komponenti ne treba refactor jer svi koriste useAuth() API.
// ============================================================================

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const MOCK_AUTH_ENABLED = import.meta.env.VITE_DEV_MOCK_AUTH === 'true';
const MOCK_USER_ID = import.meta.env.VITE_DEV_TEST_USER_ID ?? '';
const MOCK_USER_EMAIL = import.meta.env.VITE_DEV_TEST_USER_EMAIL ?? 'dev-test@local';

// P0 security guard — mock auth NIKAD ne sme da pristane u prod bundle-u.
// Bez ovoga, slucajni VITE_DEV_MOCK_AUTH=true u prod env-u znaci sign-in bypass
// kroz seeded UUID. Throw u module-init faze — fail-loud, ne tise.
if (MOCK_AUTH_ENABLED && import.meta.env.PROD) {
  throw new Error(
    '[AuthContext] FATAL: VITE_DEV_MOCK_AUTH=true u PROD build-u. ' +
      'Mock auth je dev-only — proverava env vars pre deploya.',
  );
}

// ============================================================================
// Mock User helper — minimalan supabase User shape
// ============================================================================

function createMockUser(): User {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    id: MOCK_USER_ID,
    email: MOCK_USER_EMAIL,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { first_name: 'Dev', last_name: 'Test' },
    created_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    identities: [],
    factors: [],
  } as any;
}

// ============================================================================
// Context shape
// ============================================================================

export interface AuthContextValue {
  user: User | null;
  /** Convenience accessor — `user?.id`. null kad nije ulogovan. */
  clientId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Da li se koristi mock mode (UI moze da prikaze badge "DEV") */
  isMockAuth: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (MOCK_AUTH_ENABLED) {
      // Mock mode — sintetisana sesija, bez Supabase pinga
      if (!MOCK_USER_ID) {
        // eslint-disable-next-line no-console
        console.warn(
          '[AuthContext] VITE_DEV_MOCK_AUTH=true ali VITE_DEV_TEST_USER_ID nije postavljen. ' +
          'Dodaj UUID u .env.',
        );
        setUser(null);
        setIsLoading(false);
        return;
      }
      setUser(createMockUser());
      setIsLoading(false);
      // eslint-disable-next-line no-console
      console.info(`[AuthContext] Mock auth aktivan: ${MOCK_USER_EMAIL} (${MOCK_USER_ID})`);
      return;
    }

    // Real auth mode — Supabase session listener
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async (): Promise<void> => {
    if (MOCK_AUTH_ENABLED) {
      // U mock mode-u, sign out ne radi nista (osvezi stranicu da resetujes)
      // eslint-disable-next-line no-console
      console.info('[AuthContext] Mock auth: signOut je no-op u dev mode-u.');
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    clientId: user?.id ?? null,
    isLoading,
    isAuthenticated: user !== null,
    isMockAuth: MOCK_AUTH_ENABLED,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() mora biti pozvan unutar <AuthProvider>');
  }
  return ctx;
}
