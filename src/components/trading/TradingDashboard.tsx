import React from 'react';
import { ArrowLeft, Activity } from 'lucide-react';

interface TradingDashboardProps {
  onBackToHome: () => void;
}

export const TradingDashboard: React.FC<TradingDashboardProps> = ({ onBackToHome }) => (
  <main className="min-h-screen bg-[#000000] px-6 py-6 text-[#f0f0f0] sm:px-10 sm:py-8 lg:px-12">
    <div className="mx-auto max-w-7xl">
      <button
        type="button"
        onClick={onBackToHome}
        className="mb-10 inline-flex items-center gap-2 border border-white/20 px-4 py-2 font-mono-geist text-xs uppercase tracking-wider text-white/70 transition-colors hover:border-white hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="mb-2 font-mono-geist text-[10px] uppercase tracking-[0.2em] text-white/40">
            TICKS // TRADING TERMINAL
          </p>
          <h1 className="font-silkscreen text-2xl tracking-wider sm:text-4xl">
            MARKET DASHBOARD
          </h1>
        </div>
        <span className="inline-flex items-center gap-2 font-mono-geist text-xs text-amber-300">
          <Activity className="h-4 w-4" />
          DASHBOARD PREVIEW
        </span>
      </header>

      <section
        aria-label="Trading dashboard preview"
        className="grid min-h-80 place-items-center border border-dashed border-white/20 bg-[#0a0a0a] p-8 text-center"
      >
        <div className="max-w-lg">
          <h2 className="mb-3 font-silkscreen text-lg tracking-wide">TRADING COMPONENTS NOT CONNECTED</h2>
          <p className="font-mono-geist text-sm leading-relaxed text-white/50">
            This is a starter dashboard scaffold. Replace it with the Google Studio trading
            components when their source files are available.
          </p>
        </div>
      </section>
    </div>
  </main>
);

export default TradingDashboard;
