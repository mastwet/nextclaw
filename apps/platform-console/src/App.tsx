import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from '@/api/client';
import { Button } from '@/components/ui/button';
import { LoginPage } from '@/pages/LoginPage';
import { UserDashboardPage } from '@/pages/UserDashboardPage';
import { useAuthStore } from '@/store/auth';

export default function App(): JSX.Element {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const meQuery = useQuery({
    queryKey: ['me', token],
    queryFn: async () => {
      if (!token) {
        throw new Error('No token');
      }
      return await fetchMe(token);
    },
    enabled: Boolean(token)
  });

  useEffect(() => {
    if (meQuery.data?.user) {
      setUser(meQuery.data.user);
    }
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (meQuery.error) {
      logout();
    }
  }, [meQuery.error, logout]);

  if (!token) {
    return <LoginPage />;
  }

  if (meQuery.isLoading) {
    return <main className="p-6 text-sm text-slate-500">加载 NextClaw Account...</main>;
  }

  return (
    <main className="min-h-screen bg-transparent text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-white/85 px-5 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-700">NextClaw Platform</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{user?.email ?? ''}</p>
              {user?.role ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
                  {user.role}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="rounded-2xl border border-slate-200 px-4" onClick={() => logout()}>
              退出
            </Button>
          </div>
        </header>

        <UserDashboardPage token={token} />
      </div>
    </main>
  );
}
