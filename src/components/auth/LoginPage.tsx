import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import type { AuthUser } from './AuthGate';

interface LoginPageProps {
  notice?: string | null;
  onSignedIn: (user: AuthUser) => void;
}

export function LoginPage({ notice, onSignedIn }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.user) {
        setError(body?.error?.message || 'Não foi possível entrar agora. Tente novamente em instantes.');
        return;
      }
      setPassword('');
      onSignedIn(body.user);
    } catch {
      setError('Sem conexão com o servidor. Verifique a internet e tente de novo.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'h-12 w-full rounded-xl border border-[var(--border-input)] bg-[var(--surface-input)] pl-11 pr-4 text-sm text-[var(--text-title)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-focus)]';

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--surface-app)] px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[image:var(--glow-brand)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/brand/logo-mark-alpha.png" alt="" className="h-24 w-24 object-contain drop-shadow-[0_10px_24px_var(--border-brand)]" />
          <div>
            <p className="text-xl font-extrabold leading-tight text-[var(--text-title)]">
              <span className="text-[var(--brand-500)]">Radar</span> de Oferta
            </p>
            <p className="text-xs text-[var(--text-muted)]">Automação para Afiliados</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--r-card)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-[var(--shadow-raised)] sm:p-7"
          noValidate
        >
          <h1 className="text-2xl font-extrabold text-[var(--text-title)]">Entrar</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Acesse seu painel com e-mail e senha.</p>

          {notice && !error && (
            <p role="status" className="mt-5 rounded-xl border border-[rgba(245,158,11,.35)] bg-[var(--surface-amber-soft)] px-3 py-2.5 text-sm text-[var(--amber-400)]">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-3 py-2.5 text-sm text-[var(--red-400)]">
              {error}
            </p>
          )}

          <label htmlFor="login-email" className="mt-5 block text-[13px] font-semibold text-[var(--text-body)]">E-mail</label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id="login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className={inputClass}
            />
          </div>

          <label htmlFor="login-password" className="mt-4 block text-[13px] font-semibold text-[var(--text-body)]">Senha</label>
          <div className="relative mt-1.5">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:text-[var(--text-title)]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="btn-brand mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:cursor-not-allowed"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">Acesso restrito ao dono do painel.</p>
      </div>
    </main>
  );
}
