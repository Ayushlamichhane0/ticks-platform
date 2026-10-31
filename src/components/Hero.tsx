import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Terminal, Activity, Code2, Globe } from 'lucide-react';

interface HeroProps {
  onContactClick?: () => void;
  onLaunchTrading?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onContactClick, onLaunchTrading }) => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="w-full pt-4 pb-12 sm:pt-8 sm:pb-16 border-b border-white/10">
      {/* Top Meta Bar */}
      <div className="flex justify-between items-center font-mono-geist text-[10px] text-white/40 tracking-[0.2em] mb-8 pb-3 border-b border-white/10 uppercase">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          <span>TICKS // HIGH-PERFORMANCE MARKET TERMINALS</span>
        </span>
        <span>SYS.PROD // TICKS.COM.NP</span>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        
        {/* Left Column: Brand & Hero Intro */}
        <div className="xl:col-span-7 flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Silkscreen Highlight Title */}
            <div className="mb-4 inline-block">
              <span className="font-mono-geist text-[11px] text-white/50 tracking-widest uppercase border border-white/15 px-2.5 py-1">
                ALGORITHMIC TRADING &amp; MARKET TELEMETRY
              </span>
            </div>

            <h1 className="font-silkscreen text-[clamp(3.2rem,8.5vw,7.5rem)] leading-none text-white tracking-tight uppercase mb-4 select-none">
              TICKS
            </h1>

            <h2 className="font-mono-geist text-base sm:text-lg text-white/90 font-medium tracking-wide mb-4">
              QUANTITATIVE SYSTEMS, LIVE FOREX ENGINES &amp; SECTOR HEATMAPS
            </h2>

            <p className="font-inter text-sm sm:text-base text-white/70 max-w-xl leading-relaxed mb-8 font-light">
              Designing microsecond market simulators, live foreign exchange execution terminals, dynamic S&amp;P 500 treemaps, and interactive weather radar systems with zero latency and brutalist precision.
            </p>

            {/* Simple Direct Actions */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 max-w-xl">
              <button
                onClick={() => scrollTo('forex')}
                className="py-3.5 px-6 font-silkscreen text-xs uppercase tracking-wider bg-white text-black font-bold hover:bg-neutral-200 transition-all cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <span>OPEN FOREX CHART</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </button>

              <button
                onClick={() => scrollTo('heatmap')}
                className="py-3.5 px-6 font-silkscreen text-xs uppercase tracking-wider bg-transparent text-white border border-white/20 hover:border-white transition-all cursor-pointer text-center"
              >
                SECTOR HEATMAP
              </button>

              <button
                onClick={onLaunchTrading}
                className="py-3.5 px-6 font-silkscreen text-xs uppercase tracking-wider bg-emerald-400 text-black font-bold hover:bg-emerald-300 transition-all cursor-pointer text-center"
              >
                LAUNCH TRADING TERMINAL
              </button>
            </div>

            {/* Quick spec footer */}
            <div className="mt-8 flex flex-wrap items-center gap-4 font-mono-geist text-[11px] text-white/40">
              <span className="flex items-center gap-1.5 text-white/70">
                <Globe className="w-3.5 h-3.5 text-white/50" /> Global Data Feeds
              </span>
              <span>·</span>
              <span>Microsecond Latency Engine</span>
              <span>·</span>
              <span>100% Verified Open Source</span>
            </div>
          </motion.div>
        </div>

        {/* Right Column: High-Res Official Logo Showcase & Core Metrics */}
        <div className="xl:col-span-5 flex flex-col justify-between bg-[#0a0a0a] border border-white/15 p-6 sm:p-7 space-y-6">
          
          {/* Logo Showcase Display Box */}
          <div className="relative bg-black border border-white/10 p-6 flex flex-col items-center justify-center text-center overflow-hidden">
            <div className="w-40 h-40 max-w-full flex items-center justify-center mb-3">
              <img
                src="/assets/aistudio/ticks-high-resolution-logo_51ba51a4.png"
                alt="TICKS Official Logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="font-silkscreen text-xs text-white tracking-widest">
              TICKS // OFFICIAL MARK
            </div>
            <div className="font-mono-geist text-[10px] text-white/40 mt-1 uppercase">
              Falcon · Monospace · Signal Radar
            </div>
          </div>

          {/* Simple Clean Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="border border-white/10 bg-[#0e0e0e] p-3.5">
              <div className="font-mono-geist text-[10px] text-white/50 uppercase">Active Pipelines</div>
              <div className="font-silkscreen text-xl text-white mt-1">4 DEPLOYED</div>
            </div>

            <div className="border border-white/10 bg-[#0e0e0e] p-3.5">
              <div className="font-mono-geist text-[10px] text-white/50 uppercase">Latency Target</div>
              <div className="font-silkscreen text-xl text-white mt-1">&lt; 14 MS</div>
            </div>
          </div>

          {/* Core Stack Highlights */}
          <div className="border-t border-white/10 pt-4 font-mono-geist">
            <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
              ENGINEERING STACK
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['TypeScript', 'Python', 'React 19', 'WebSockets', 'Tailwind', 'Node.js'].map((tech) => (
                <span
                  key={tech}
                  className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 text-white/80"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
