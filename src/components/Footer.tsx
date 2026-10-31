import React from 'react';
import { ArrowUp, Github, Linkedin, Mail, Twitter, Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#050505] border-t border-white/10 px-6 py-8 sm:px-10 flex flex-col md:flex-row justify-between items-center font-mono-geist text-[11px] text-white/50 tracking-wider gap-4">
      <div className="flex items-center gap-3">
        <img
          src="/assets/aistudio/ticks-high-resolution-logo_51ba51a4.png"
          alt="TICKS Logo"
          className="w-6 h-6 object-contain"
        />
        <div>
          <span className="font-silkscreen text-xs text-white">TICKS</span>
          <span className="text-white/40 ml-2">© 2026 TICKS SYSTEMS // REAL-TIME MARKET PLATFORMS</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Github className="w-3.5 h-3.5" />
          <span>GITHUB</span>
        </a>
        <a
          href="#forex"
          className="hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>TERMINAL</span>
        </a>
        <button
          onClick={scrollToTop}
          className="hover:text-white transition-colors p-1 flex items-center gap-1 cursor-pointer"
          aria-label="Back to top"
        >
          <span className="font-silkscreen text-[10px]">TOP</span>
          <ArrowUp className="h-3 w-3" />
        </button>
      </div>
    </footer>
  );
};

export default Footer;
