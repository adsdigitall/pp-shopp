import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { LoginPage } from './LoginPage';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({ user: null, logout: async () => undefined });

export const useAuth = () => useContext(AuthContext);

type Status = 'checking' | 'signed-out' | 'signed-in';

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const statusRef = useRef<Status>('checking');
  statusRef.current = status;

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' });
      const body = await response.json();
      setUser(body?.user ?? null);
      setStatus(body?.authenticated ? 'signed-in' : 'signed-out');
    } catch {
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => { void checkSession(); }, [checkSession]);

  // Sessão expirada no meio do uso: qualquer 401 AUTH_REQUIRED da API volta para o login.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401 && statusRef.current === 'signed-in') {
        const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
        const sameOriginApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`);
        if (sameOriginApi && !url.includes('/api/auth/')) {
          const code = await response.clone().json().then((b) => b?.error?.code).catch(() => null);
          if (code === 'AUTH_REQUIRED') {
            setUser(null);
            setSessionExpired(true);
            setStatus('signed-out');
          }
        }
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setUser(null);
      setSessionExpired(false);
      setStatus('signed-out');
    }
  }, []);

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--surface-app)]">
        <img src="/brand/logo-mark-alpha.png" alt="Carregando" className="h-12 w-12 animate-pulse object-contain" />
      </div>
    );
  }

  if (status === 'signed-out') {
    return (
      <LoginPage
        notice={sessionExpired ? 'Sua sessão expirou. Entre novamente.' : null}
        onSignedIn={(signedUser) => {
          setUser(signedUser);
          setSessionExpired(false);
          setStatus('signed-in');
        }}
      />
    );
  }

  return <AuthContext.Provider value={{ user, logout }}>{children}</AuthContext.Provider>;
}
