import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Hero } from './components/Hero.tsx';
import { MarketHeatmap } from './components/MarketHeatmap';
import { Projects } from './components/Projects';
import { GithubStats } from './components/GithubStats';
import { Footer } from './components/Footer';
import { ProjectModal } from './components/ProjectModal';
import { ContactModal } from './components/ContactModal';
import { Project } from './types/project';
import { TradingDashboard } from './components/trading/TradingDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { authClient, getAuthAccessToken, getAuthenticatedUser } from './auth';
import { useMarketStore } from './store/useMarketStore';
import { Toaster, toast } from 'react-hot-toast';

type AppView = 'landing' | 'trading' | 'admin';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const selectedSymbol = useMarketStore((store) => store.selectedSymbol);
  const currentUser = useMarketStore((store) => store.currentUser);
  const viewAsUserId = useMarketStore((store) => store.viewAsUserId);
  const startPricePolling = useMarketStore((store) => store.startPricePolling);
  const stopPricePolling = useMarketStore((store) => store.stopPricePolling);
  const setViewAsUser = useMarketStore((store) => store.setViewAsUser);
  const setCurrentUser = useMarketStore((store) => store.setCurrentUser);

  const handleAuthChange = useCallback(async (user: Awaited<ReturnType<typeof getAuthenticatedUser>>) => {
    if (!user) {
      setCurrentUser(null);
      return;
    }

    if (!viewAsUserId) setCurrentUser(null);

    try {
      const token = await getAuthAccessToken();
      const response = await fetch('/.netlify/functions/get-user', {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(viewAsUserId ? { 'X-View-As-User': viewAsUserId } : {}),
        },
      });
      if (!response.ok) {
        console.warn(`Unable to load the signed-in profile (HTTP ${response.status}).`);
        return;
      }

      const userData = await response.json() as {
        success?: boolean;
        user?: {
          id?: unknown;
          email?: unknown;
          demo_balance?: unknown;
          is_admin?: unknown;
          created_at?: unknown;
        };
      };
      const profile = userData.user;
      if (
        userData.success !== true ||
        profile === undefined ||
        typeof profile.id !== 'string' ||
        typeof profile.is_admin !== 'boolean'
      ) {
        throw new Error('The profile response is missing required user fields.');
      }

      if (viewAsUserId) return;

      setCurrentUser({
        id: profile.id,
        email: typeof profile.email === 'string' ? profile.email : null,
        demo_balance: typeof profile.demo_balance === 'number' ? profile.demo_balance : 0,
        is_admin: profile.is_admin,
        created_at: typeof profile.created_at === 'string' ? profile.created_at : null,
      });
    } catch (error) {
      console.warn('Unable to verify the signed-in user profile.', error);
      if (!viewAsUserId) setCurrentUser(null);
    }
  }, [setCurrentUser, viewAsUserId]);

  useEffect(() => {
    let active = true;
    void getAuthenticatedUser()
      .then((user) => {
        if (active) void handleAuthChange(user);
      })
      .catch((error: unknown) => {
        console.warn('Unable to check the signed-in user.', error);
        if (active) setCurrentUser(null);
      });

    return () => {
      active = false;
    };
  }, [handleAuthChange, setCurrentUser]);

  useEffect(() => {
    startPricePolling(selectedSymbol);
    return stopPricePolling;
  }, [selectedSymbol, startPricePolling, stopPricePolling]);

  const handleSignOut = useCallback(async () => {
    if (!authClient) return;

    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      setCurrentUser(null);
      setViewAsUser(null);
      setView('landing');
      toast.success('Signed out successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign out. Please try again.');
    }
  }, [setCurrentUser, setViewAsUser]);

  const handleSelectAssetForTerminal = () => {
    document.getElementById('forex')?.scrollIntoView({ behavior: 'smooth' });
  };

  const appToaster = (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1f2937',
          color: '#d1d5db',
          border: '1px solid #374151',
          fontFamily: 'Geist Mono, monospace',
        },
        success: { iconTheme: { primary: '#34d399', secondary: '#111827' } },
        error: { iconTheme: { primary: '#fb7185', secondary: '#111827' } },
      }}
    />
  );

  if (view === 'trading') {
    return (
      <>
        {appToaster}
        <TradingDashboard
          onBackToHome={() => setView('landing')}
          onExitGodMode={() => setView('admin')}
          onAuthChange={handleAuthChange}
        />
      </>
    );
  }

  if (view === 'admin') {
    return (
      <>
        {appToaster}
        <AdminDashboard
          onBack={() => {
            setViewAsUser(null);
            setView('landing');
          }}
          onEnterGodMode={() => setView('trading')}
        />
      </>
    );
  }

  return (
    <>
      {appToaster}
      <div className="min-h-screen bg-[#000000] text-[#f0f0f0] font-inter selection:bg-white selection:text-black flex flex-col md:flex-row ticks-grid-bg">
        <Sidebar
          onAdminClick={() => setView('admin')}
          onContactClick={() => setContactModalOpen(true)}
          onSignOut={() => void handleSignOut()}
        />
        <div className="min-w-0 flex-1">
          <main className="flex-1 px-6 py-6 sm:px-10 sm:py-8 lg:px-12 lg:py-10 max-w-7xl w-full mx-auto space-y-2">
            <Hero
              onContactClick={() => setContactModalOpen(true)}
              onLaunchTrading={() => setView('trading')}
            />
            <MarketHeatmap onSelectAssetForTerminal={handleSelectAssetForTerminal} />
            <Projects onOpenDetails={(project) => setSelectedProject(project)} />
            <GithubStats />
          </main>
          <Footer />
        </div>
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
        />
      </div>
    </>
  );
}
