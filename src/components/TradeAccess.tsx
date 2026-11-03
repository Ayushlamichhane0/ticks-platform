import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { authClient, getAuthAccessToken, getAuthenticatedUser } from '../auth';
import { ForexChart } from './ForexChart';
import toast from 'react-hot-toast';

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;

export interface TradeAccessProps {
  onAuthChange?: (user: AuthenticatedUser | null) => void;
  children?: ReactNode;
}

export function TradeAccess({ onAuthChange, children }: TradeAccessProps) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getAuthenticatedUser()
      .then((authenticatedUser) => {
        if (active) {
          setUser(authenticatedUser);
          onAuthChange?.(authenticatedUser);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          onAuthChange?.(null);
          const message = 'Unable to check your sign-in. Please refresh and try again.';
          setErrorMessage(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onAuthChange]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authClient) return;

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const result = isSigningUp
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });

      if (result.error) {
        setErrorMessage(result.error.message ?? 'Authentication failed.');
        toast.error(result.error.message ?? 'Authentication failed.');
        return;
      }

      const authenticatedUser = await getAuthenticatedUser();
      if (authenticatedUser) {
        setUser(authenticatedUser);
        onAuthChange?.(authenticatedUser);
        setPassword('');
        toast.success(isSigningUp ? 'Account created successfully.' : 'Signed in successfully.');
      } else {
        const message = 'Check your email to complete sign-in.';
        setStatusMessage(message);
        toast.success(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center py-12">
        <p className="border border-white/10 bg-[#0e0e0e] px-5 py-4 font-mono-geist text-sm text-white/60">
          Checking sign-in…
        </p>
      </section>
    );
  }

  if (!authClient) {
    return (
      <section className="flex min-h-[50vh] items-center justify-center py-12">
        <div className="w-full max-w-lg border border-amber-500/30 bg-[#0e0e0e] p-6 shadow-2xl shadow-black/50 sm:p-8" role="alert">
          <p className="font-mono-geist text-xs tracking-[0.2em] text-amber-300">ACCESS CONTROL // UNAVAILABLE</p>
          <h2 className="mt-3 font-silkscreen text-sm text-white">TRADING SIGN-IN UNAVAILABLE</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Set the public VITE_NEON_AUTH_URL build variable to enable Neon Auth.
          </p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section id="forex" className="flex min-h-[65vh] items-center justify-center py-12 sm:py-16">
        <div className="w-full max-w-lg overflow-hidden border border-white/15 bg-[#0a0a0a]/95 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-3 sm:px-7">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center border border-emerald-400/50 bg-emerald-400/10 font-silkscreen text-xs text-emerald-300">T</span>
              <span className="font-silkscreen text-[11px] tracking-[0.2em] text-white">TICKS</span>
            </div>
            <span className="flex items-center gap-2 font-mono-geist text-[10px] text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              AUTH REQUIRED
            </span>
          </div>
          <div className="p-6 backdrop-blur sm:p-8">
            <p className="font-mono-geist text-[10px] tracking-[0.18em] text-emerald-400">AUTHENTICATION REQUIRED // SYSTEM ACCESS</p>
            <h2 className="mt-3 font-silkscreen text-xl text-white">
              {isSigningUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Sign in to open trades and access your private demo balance.
            </p>
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              {isSigningUp && (
                <label className="block font-mono-geist text-xs text-white/65">
                  NAME
              <input
                autoComplete="name"
                className="mt-2 w-full border border-white/15 bg-black/70 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-400/30"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
                </label>
              )}
              <label className="block font-mono-geist text-xs text-white/65">
                EMAIL ADDRESS
            <input
              autoComplete="email"
              className="mt-2 w-full border border-white/15 bg-black/70 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-400/30"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
              </label>
              <label className="block font-mono-geist text-xs text-white/65">
                PASSWORD
            <input
              autoComplete={isSigningUp ? 'new-password' : 'current-password'}
              className="mt-2 w-full border border-white/15 bg-black/70 px-3 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-400/30"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
              </label>
              {errorMessage && <p className="border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300" role="alert">{errorMessage}</p>}
              {statusMessage && <p className="border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-300" role="status">{statusMessage}</p>}
              <button
                className="w-full border border-emerald-300 bg-emerald-300 px-4 py-3 font-silkscreen text-xs font-bold tracking-wider text-black transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-50"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'PLEASE WAIT…' : isSigningUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
              </button>
            </form>
            <button
              className="mt-5 w-full text-center font-mono-geist text-xs text-white/50 transition hover:text-white"
              onClick={() => {
                setIsSigningUp((current) => !current);
                setErrorMessage(null);
                setStatusMessage(null);
              }}
              type="button"
            >
              {isSigningUp ? 'Already registered? Sign in' : 'New here? Create an account'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {errorMessage && <p className="mb-4 text-sm text-red-400" role="alert">{errorMessage}</p>}
      <ForexChart getAccessToken={getAuthAccessToken} />
      {children}
    </>
  );
}
