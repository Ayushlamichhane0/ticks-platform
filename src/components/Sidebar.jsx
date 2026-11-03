import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { MARKET_INSTRUMENTS } from '../constants/market';
import { useMarketStore } from '../store/useMarketStore';

export const Sidebar = ({ onContactClick }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const setSelectedSymbol = useMarketStore((store) => store.setSelectedSymbol);

  const scrollTo = (id) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="lg:hidden sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#050505] px-5 py-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/aistudio/ticks-high-resolution-logo_51ba51a4.png"
            alt="Ticks Logo"
            className="w-7 h-7 object-contain rounded-sm"
          />
          <span className="font-silkscreen text-sm font-bold tracking-wider text-white">
            TICKS
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 text-white/70 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-x-0 top-[51px] z-50 max-h-[85vh] overflow-y-auto border-b border-white/10 bg-[#050505] p-6 space-y-4 font-mono-geist text-xs uppercase tracking-wider">
          <button
            onClick={() => scrollTo('hero')}
            className="block w-full text-left py-2 text-white/70 hover:text-white"
          >
            00. HOME
          </button>
          <button
            onClick={() => scrollTo('forex')}
            className="block w-full text-left py-2 text-white/70 hover:text-white"
          >
            01. CRYPTO LIVE
          </button>
          <button
            onClick={() => scrollTo('heatmap')}
            className="block w-full text-left py-2 text-white/70 hover:text-white"
          >
            02. CRYPTO HEATMAP
          </button>
          <button
            onClick={() => scrollTo('projects')}
            className="block w-full text-left py-2 text-white/70 hover:text-white"
          >
            03. PROJECTS
          </button>
          <button
            onClick={() => scrollTo('github')}
            className="block w-full text-left py-2 text-white/70 hover:text-white"
          >
            04. GITHUB
          </button>
          <div className="border-t border-white/10 pt-4">
            <div className="mb-2 text-[10px] text-white/40">QUICK MARKETS</div>
            <div className="grid grid-cols-2 gap-2">
              {MARKET_INSTRUMENTS.map((instrument) => (
                <button
                  key={instrument.feedSymbol}
                  onClick={() => {
                    if (instrument.feedSymbol) setSelectedSymbol(instrument.feedSymbol);
                    scrollTo('forex');
                  }}
                  className="border border-white/10 px-2 py-2 text-left text-white/70 hover:border-amber-400/60 hover:text-white"
                >
                  <span className="block">{instrument.symbol}</span>
                  <span className="text-[9px] text-white/40">{instrument.feedSymbol}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              setMobileOpen(false);
              onContactClick?.();
            }}
            className="w-full text-center py-2.5 bg-white text-black font-silkscreen text-xs font-bold tracking-wider mt-2"
          >
            CONTACT // INQUIRY
          </button>
        </div>
      )}

      <nav
        aria-label="System navigation"
        className="hidden lg:flex flex-col justify-between w-64 shrink-0 bg-[#050505] border-r border-white/10 p-8 h-screen sticky top-0 z-40 select-none"
      >
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border border-white/20 bg-black flex items-center justify-center p-1 overflow-hidden">
                <img
                  src="/assets/aistudio/ticks-high-resolution-logo_51ba51a4.png"
                  alt="TICKS Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="font-silkscreen text-base font-bold text-white block tracking-wider">
                  TICKS
                </span>
                <span className="font-mono-geist text-[10px] text-white/50 tracking-widest block uppercase">
                  PLATFORM // v2.6
                </span>
              </div>
            </div>
            <div className="h-[1px] bg-white/10 w-full" />
          </div>

          <div className="flex flex-col gap-3 font-mono-geist text-xs tracking-wider">
            <button
              onClick={() => scrollTo('hero')}
              className="text-left py-1 text-white/50 hover:text-white transition-all cursor-pointer flex items-center gap-2 group"
            >
              <span className="text-white/30 group-hover:text-white font-silkscreen text-[10px]">00</span>
              <span className="group-hover:translate-x-1 transition-transform">HOME</span>
            </button>
            <button
              onClick={() => scrollTo('forex')}
              className="text-left py-1 text-white/50 hover:text-white transition-all cursor-pointer flex items-center gap-2 group"
            >
              <span className="text-white/30 group-hover:text-white font-silkscreen text-[10px]">01</span>
              <span className="group-hover:translate-x-1 transition-transform">CRYPTO LIVE</span>
            </button>
            <button
              onClick={() => scrollTo('heatmap')}
              className="text-left py-1 text-white/50 hover:text-white transition-all cursor-pointer flex items-center gap-2 group"
            >
              <span className="text-white/30 group-hover:text-white font-silkscreen text-[10px]">02</span>
              <span className="group-hover:translate-x-1 transition-transform">CRYPTO HEATMAP</span>
            </button>
            <button
              onClick={() => scrollTo('projects')}
              className="text-left py-1 text-white/50 hover:text-white transition-all cursor-pointer flex items-center gap-2 group"
            >
              <span className="text-white/30 group-hover:text-white font-silkscreen text-[10px]">03</span>
              <span className="group-hover:translate-x-1 transition-transform">PROJECTS</span>
            </button>
            <button
              onClick={() => scrollTo('github')}
              className="text-left py-1 text-white/50 hover:text-white transition-all cursor-pointer flex items-center gap-2 group"
            >
              <span className="text-white/30 group-hover:text-white font-silkscreen text-[10px]">04</span>
              <span className="group-hover:translate-x-1 transition-transform">GITHUB</span>
            </button>
          </div>
          <div className="border-t border-white/10 pt-4 font-mono-geist">
            <div className="mb-2 text-[10px] tracking-wider text-white/40">QUICK MARKETS</div>
            <div className="space-y-1">
              {MARKET_INSTRUMENTS.map((instrument) => (
                <button
                  key={instrument.feedSymbol}
                  onClick={() => {
                    if (instrument.feedSymbol) setSelectedSymbol(instrument.feedSymbol);
                    scrollTo('forex');
                  }}
                  className="flex w-full items-center justify-between border border-transparent px-2 py-1.5 text-left text-white/60 hover:border-white/10 hover:bg-white/5 hover:text-white"
                >
                  <span>{instrument.symbol}</span>
                  <span className="text-[9px] text-white/35">{instrument.feedSymbol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-white/10 font-mono-geist">
          <div className="flex items-center gap-2 text-[10px] text-white/60 tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>KTM · 27.7172° N</span>
          </div>

          <button
            onClick={onContactClick}
            className="w-full py-2.5 px-3 bg-white hover:bg-neutral-200 text-black font-silkscreen text-xs font-bold tracking-wider transition-colors cursor-pointer text-center block"
          >
            GET IN TOUCH
          </button>

          <div className="flex items-center justify-between text-[10px] text-white/40 pt-1">
            <span>TICKS.COM.NP</span>
            <span>2026</span>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
