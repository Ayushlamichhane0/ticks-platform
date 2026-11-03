import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Pencil, RefreshCw, ShieldAlert, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthAccessToken } from '../auth';
import { useMarketStore } from '../store/useMarketStore';

interface AdminUser {
  id: string;
  email: string | null;
  demo_balance: number;
  is_admin: boolean;
  created_at: string | null;
}

interface AdminDashboardProps {
  onBack: () => void;
  onEnterGodMode: () => void;
}

type AccessState = 'loading' | 'allowed' | 'forbidden' | 'error';

export function AdminDashboard({ onBack, onEnterGodMode }: AdminDashboardProps) {
  const setViewAsUser = useMarketStore((store) => store.setViewAsUser);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [accessState, setAccessState] = useState<AccessState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setAccessState('loading');
    setErrorMessage('');
    try {
      const token = await getAuthAccessToken();
      const response = await fetch('/.netlify/functions/admin-get-users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        setUsers([]);
        setAccessState('forbidden');
        return;
      }

      const result = await response.json() as { success?: boolean; message?: string; users?: AdminUser[] };
      if (!response.ok || !result.success || !Array.isArray(result.users)) {
        throw new Error(result.message || 'Unable to load admin users.');
      }

      setUsers(result.users);
      setAccessState('allowed');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load admin users.');
      setAccessState('error');
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const openBalanceEditor = (user: AdminUser) => {
    setSelectedUser(user);
    setNewBalance(String(user.demo_balance));
  };

  const closeBalanceEditor = () => {
    if (isSaving) return;
    setSelectedUser(null);
    setNewBalance('');
  };

  const saveBalance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;

    const balance = Number(newBalance);
    if (!Number.isFinite(balance) || balance < 0) {
      toast.error('Enter a valid non-negative balance.');
      return;
    }

    setIsSaving(true);
    try {
      const token = await getAuthAccessToken();
      const response = await fetch('/.netlify/functions/admin-update-balance', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId: selectedUser.id, newBalance: balance }),
      });

      if (response.status === 401 || response.status === 403) {
        setUsers([]);
        setAccessState('forbidden');
        setSelectedUser(null);
        toast.error('403 Forbidden');
        return;
      }

      const result = await response.json() as { success?: boolean; message?: string; user?: AdminUser };
      if (!response.ok || !result.success || !result.user) {
        throw new Error(result.message || 'Unable to update the balance.');
      }

      setUsers((currentUsers) => currentUsers.map((user) => (
        user.id === result.user?.id ? result.user : user
      )));
      setSelectedUser(null);
      setNewBalance('');
      toast.success('Demo balance updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update the balance.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button
              aria-label="Back to home"
              className="border border-white/15 p-2 text-white/70 transition hover:border-white/40 hover:text-white"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="font-mono-geist text-[10px] tracking-[0.2em] text-emerald-300">PRIVILEGED ACCESS // VERIFIED SERVER-SIDE</p>
              <h1 className="mt-2 font-silkscreen text-lg tracking-wide sm:text-2xl">ADMIN PANEL</h1>
            </div>
          </div>
          {accessState === 'allowed' && (
            <button
              className="flex items-center gap-2 border border-white/15 px-3 py-2 font-mono-geist text-xs text-white/70 transition hover:border-emerald-300/50 hover:text-white"
              onClick={() => void fetchUsers()}
              type="button"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              REFRESH
            </button>
          )}
        </header>

        {accessState === 'loading' && (
          <div className="flex min-h-64 items-center justify-center gap-3 text-white/60" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
            <span className="font-mono-geist text-sm">VERIFYING ADMIN ACCESS…</span>
          </div>
        )}

        {accessState === 'forbidden' && (
          <section className="mx-auto max-w-xl border border-red-400/30 bg-red-400/[0.04] p-8 text-center" role="alert">
            <ShieldAlert className="mx-auto h-9 w-9 text-red-300" />
            <h2 className="mt-4 font-silkscreen text-lg text-red-200">403 FORBIDDEN</h2>
            <p className="mt-3 font-mono-geist text-sm leading-6 text-white/60">
              This account is not authorized to access administrative data.
            </p>
            <button
              className="mt-6 border border-white/20 px-4 py-2 font-mono-geist text-xs text-white/70 hover:text-white"
              onClick={onBack}
              type="button"
            >
              RETURN
            </button>
          </section>
        )}

        {accessState === 'error' && (
          <section className="border border-amber-400/25 bg-amber-400/[0.03] p-6" role="alert">
            <p className="font-mono-geist text-sm text-amber-200">ADMIN DATA UNAVAILABLE</p>
            <p className="mt-2 text-sm text-white/60">{errorMessage}</p>
            <button
              className="mt-4 border border-white/20 px-4 py-2 font-mono-geist text-xs text-white/70 hover:text-white"
              onClick={() => void fetchUsers()}
              type="button"
            >
              TRY AGAIN
            </button>
          </section>
        )}

        {accessState === 'allowed' && (
          <>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono-geist text-[10px] tracking-[0.18em] text-white/40">USER DIRECTORY</p>
                <p className="mt-1 text-sm text-white/60">{users.length} account{users.length === 1 ? '' : 's'}</p>
              </div>
              <p className="font-mono-geist text-[10px] text-white/35">BALANCE CHANGES ARE AUDIT LOGGED</p>
            </div>
            <div className="overflow-x-auto border border-white/10 bg-[#0b0b0b]">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead className="border-b border-white/10 bg-white/[0.03]">
                  <tr className="font-mono-geist text-[10px] tracking-[0.14em] text-white/45">
                    <th className="px-5 py-4 font-normal">EMAIL</th>
                    <th className="px-5 py-4 font-normal">DEMO BALANCE</th>
                    <th className="px-5 py-4 font-normal">ROLE</th>
                    <th className="px-5 py-4 font-normal">JOIN DATE</th>
                    <th className="px-5 py-4 text-right font-normal">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {users.map((user) => (
                    <tr className="text-sm transition hover:bg-white/[0.025]" key={user.id}>
                      <td className="px-5 py-4 text-white/85">{user.email || '—'}</td>
                      <td className="px-5 py-4 font-mono-geist text-emerald-300">
                        ${Number(user.demo_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`border px-2 py-1 font-mono-geist text-[10px] ${user.is_admin ? 'border-emerald-400/25 text-emerald-300' : 'border-white/10 text-white/50'}`}>
                          {user.is_admin ? 'ADMIN' : 'USER'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-white/55">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <button
                            className="inline-flex items-center gap-2 border border-rose-400/30 px-3 py-2 font-mono-geist text-[10px] text-rose-200 transition hover:border-rose-300/60 hover:bg-rose-400/5"
                            onClick={() => {
                              setViewAsUser(user.id, user.email);
                              onEnterGodMode();
                            }}
                            type="button"
                          >
                            ENTER GOD MODE
                          </button>
                          <button
                            className="inline-flex items-center gap-2 border border-white/15 px-3 py-2 font-mono-geist text-[10px] text-white/70 transition hover:border-emerald-300/40 hover:text-emerald-200"
                            onClick={() => openBalanceEditor(user)}
                            type="button"
                          >
                            <Pencil className="h-3 w-3" />
                            EDIT BALANCE
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td className="px-5 py-10 text-center font-mono-geist text-sm text-white/45" colSpan={5}>
                        NO USER PROFILES FOUND
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {selectedUser && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeBalanceEditor();
          }}
        >
          <section
            aria-labelledby="edit-balance-title"
            aria-modal="true"
            className="w-full max-w-md border border-white/15 bg-[#0d0d0d] p-6 shadow-2xl shadow-black/70"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-geist text-[10px] tracking-[0.18em] text-emerald-300">ACCOUNT CONTROL</p>
                <h2 className="mt-2 font-silkscreen text-sm text-white" id="edit-balance-title">EDIT DEMO BALANCE</h2>
                <p className="mt-2 break-all text-xs text-white/50">{selectedUser.email || 'Unknown account'}</p>
              </div>
              <button
                aria-label="Close dialog"
                className="p-1 text-white/45 hover:text-white disabled:opacity-40"
                disabled={isSaving}
                onClick={closeBalanceEditor}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form className="mt-6 space-y-5" onSubmit={(event) => void saveBalance(event)}>
              <label className="block font-mono-geist text-xs text-white/60" htmlFor="admin-new-balance">
                NEW BALANCE (USD)
                <input
                  autoFocus
                  className="mt-2 w-full border border-white/15 bg-black px-3 py-3 font-mono-geist text-sm text-white outline-none focus:border-emerald-300/60 focus:ring-1 focus:ring-emerald-300/20"
                  id="admin-new-balance"
                  min="0"
                  onChange={(event) => setNewBalance(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={newBalance}
                />
              </label>
              <div className="flex justify-end gap-3">
                <button
                  className="border border-white/15 px-4 py-2 font-mono-geist text-xs text-white/60 hover:text-white disabled:opacity-40"
                  disabled={isSaving}
                  onClick={closeBalanceEditor}
                  type="button"
                >
                  CANCEL
                </button>
                <button
                  className="flex min-w-32 items-center justify-center gap-2 border border-emerald-300 bg-emerald-300 px-4 py-2 font-mono-geist text-xs font-bold text-black transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isSaving ? 'SAVING…' : 'SAVE BALANCE'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
