import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch, UNAUTHORIZED_EVENT } from '../lib/api';
import { clearSession, readSession, saveSession } from '../lib/session';
import type { LoginResponse, Session } from '../types';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readSession());

  useEffect(() => {
    const syncFromStorage = () => setSession(readSession());
    const handleUnauthorized = () => setSession(null);

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (code: string) => {
    const data = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { code },
      auth: false,
      handleUnauthorized: false,
    });

    if ((data.role !== 'caja' && data.role !== 'admin') || !data.token) {
      clearSession();
      setSession(null);
      throw new Error(
        data.role && data.role !== 'caja' && data.role !== 'admin'
          ? 'Esta web es solo para administración. Si eres mesero, usa la app móvil.'
          : 'El servidor no devolvió una sesión válida.'
      );
    }

    const nextSession: Session = { token: data.token, role: data.role };
    saveSession(nextSession);
    setSession(nextSession);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: session !== null,
      role: session?.role ?? null,
      login,
      logout,
    }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
