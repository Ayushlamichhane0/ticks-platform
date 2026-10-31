import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Hero } from './components/Hero';
import { ForexChart } from './components/ForexChart';
import { MarketHeatmap } from './components/MarketHeatmap';
import { Projects } from './components/Projects';
import { GithubStats } from './components/GithubStats';
import { Footer } from './components/Footer';
import { ProjectModal } from './components/ProjectModal';
import { ContactModal } from './components/ContactModal';
import { Project } from './types/project';
import { TradingDashboard } from './components/trading/TradingDashboard';

export default function App() {
  const [view, setView] = useState<'landing' | 'trading'>('landing');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedTerminalSymbol, setSelectedTerminalSymbol] = useState<string>('GOLD');

  const handleSelectAssetForTerminal = (symbol: string) => {
    setSelectedTerminalSymbol(symbol);
    const forexElem = document.getElementById('forex');
    if (forexElem) {
      forexElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (view === 'trading') {
    return <TradingDashboard onBackToHome={() => setView('landing')} />;
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] font-inter selection:bg-white selection:text-black flex flex-col lg:flex-row ticks-grid-bg">
      {/* Persistent Left Sidebar */}
      <Sidebar onContactClick={() => setContactModalOpen(true)} />

      {/* Main Viewport Content Stack */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-6 py-6 sm:px-10 sm:py-8 lg:px-12 lg:py-10 max-w-7xl w-full mx-auto space-y-2">
          {/* Section 00: Hero */}
          <Hero
            onContactClick={() => setContactModalOpen(true)}
            onLaunchTrading={() => setView('trading')}
          />

          {/* Section 01: Live Trading Terminal */}
          <ForexChart
            selectedSymbol={selectedTerminalSymbol}
            onSelectSymbol={(sym) => setSelectedTerminalSymbol(sym)}
          />

          {/* Section 02: Stock Market Sector Heatmap Treemap */}
          <MarketHeatmap onSelectAssetForTerminal={handleSelectAssetForTerminal} />

          {/* Section 03: High-Performance Projects */}
          <Projects onOpenDetails={(project) => setSelectedProject(project)} />

          {/* Section 04: GitHub Activity */}
          <GithubStats />
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Interactive Modals */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  );
}
