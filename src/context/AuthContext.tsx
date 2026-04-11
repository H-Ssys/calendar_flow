import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth as useSupabaseAuth } from '@ofative/supabase-client';
import type { AuthState } from '@ofative/supabase-client';

// ── Context ─────────────────────────────────────────────────────────

interface AuthContextType extends AuthState {
  /** Convenience: true when user is authenticated */
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useSupabaseAuth();

  const value: AuthContextType = {
    ...auth,
    isAuthenticated: !!auth.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ────────────────────────────────────────────────────────────

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return ctx;
}
