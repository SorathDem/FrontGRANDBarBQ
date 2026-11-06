import { createContext } from 'react';
import type { Role, Session } from '../types';

export interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  role: Role | null;
  login: (code: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
