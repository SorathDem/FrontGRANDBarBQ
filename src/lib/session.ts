import type { Role, Session } from '../types';

const TOKEN_KEY = 'token';
const ROLE_KEY = 'role';

export function isRole(value: string | null): value is Role {
  return value === 'caja' || value === 'admin';
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function readSession(): Session | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);

    if (!token || !isRole(role)) {
      if (token || role) clearSession();
      return null;
    }

    return { token, role };
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(ROLE_KEY, session.role);
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  } catch {
    // Si el almacenamiento está bloqueado no hay nada más que limpiar.
  }
}
