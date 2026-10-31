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

export default function App() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#000000] text-[#f0f0f0] font-inter selection:bg-white selection:text-black flex flex-col lg:flex-row ticks-grid-bg">
      <Sidebar onContactClick={() => setContactModalOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-6 py-6 sm:px-10 sm:py-8 lg:px-12 lg:py-10 max-w-7xl w-full mx-auto space-y-2">
          <Hero onContactClick={() => setContactModalOpen(true)} />
          <ForexChart />
          <MarketHeatmap />
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
  );
}
