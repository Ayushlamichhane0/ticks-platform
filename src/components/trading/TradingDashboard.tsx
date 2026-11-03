import React from 'react';
import { AlertTriangle, ArrowLeft, Activity, X } from 'lucide-react';
import { TradeAccess, type TradeAccessProps } from '../TradeAccess';
import { TradingTerminal } from '../TradingTerminal';
import { useMarketStore } from '../../store/useMarketStore';
import { useTradingStore } from '../../store/useTradingStore';
import { buildPositions } from '../../store/positions';

interface TradingDashboardProps {
  onBackToHome: () => void;
  onExitGodMode: () => void;
  onAuthChange?: TradeAccessProps['onAuthChange'];
}

export const TradingDashboard: React.FC<TradingDashboardProps> = ({ onBackToHome, onExitGodMode, onAuthChange }) => {
  const viewAsUserId = useMarketStore((store) => store.viewAsUserId);
  const viewAsUserEmail = useMarketStore((store) => store.viewAsUserEmail);
  const setViewAsUser = useMarketStore((store) => store.setViewAsUser);
  const demoBalance = useMarketStore((store) => store.demoBalance);
  const isGodMode = viewAsUserId !== null;

  const trades = useTradingStore((store) => store.trades);
  const prices = useTradingStore((store) => store.prices);

  const openPositions = React.useMemo(() => buildPositions(trades), [trades]);
  const totalAssetValue = React.useMemo(() => {
    return openPositions.reduce((total, pos) => {
      const price = prices[pos.symbol] ?? pos.avgPrice;
      return total + pos.netAmount * price;
    }, 0);
  }, [openPositions, prices]);
  const totalEquity = (demoBalance ?? 0) + totalAssetValue;
  const unrealizedPnl = React.useMemo(() => {
    return openPositions.reduce((total, pos) => {
      const price = prices[pos.symbol] ?? pos.avgPrice;
      return total + (price - pos.avgPrice) * pos.netAmount;
    }, 0);
  }, [openPositions, prices]);

  const exitGodMode = () => {
    setViewAsUser(null);
    onExitGodMode();
  };

  return (
    <>
      {isGodMode && (
        <div className="sticky top-0 z-[80] flex flex-wrap items-center justify-between gap-3 border-b-2 border-red-200 bg-red-600 px-4 py-3 text-white shadow-lg shadow-red-950/60 sm:px-8" role="alert">
          <div className="flex items-center gap-2 font-mono-geist text-sm font-bold tracking-wide">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>🚨 GOD MODE ACTIVE: Viewing as {viewAsUserEmail || viewAsUserId}</span>
            <span className="hidden border border-white/40 px-2 py-0.5 text-[10px] sm:inline">READ ONLY</span>
          </div>
          <button
            className="inline-flex items-center gap-2 border border-white/50 px-3 py-1.5 font-mono-geist text-xs font-bold transition hover:bg-white hover:text-red-700"
            onClick={exitGodMode}
            type="button"
          >
            <X className="h-4 w-4" />
            EXIT GOD MODE
          </button>
        </div>
      )}
      <main className="min-h-screen bg-[#000000] px-4 py-6 text-[#f0f0f0] sm:px-8 sm:py-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          {!isGodMode && (
            <button
              type="button"
              onClick={onBackToHome}
              className="mb-10 inline-flex items-center gap-2 border border-white/20 px-4 py-2 font-mono-geist text-xs uppercase tracking-wider text-white/70 transition-colors hover:border-white hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
          )}

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
              {isGodMode ? 'READ-ONLY ACCOUNT VIEW' : 'DASHBOARD PREVIEW'}
            </span>
          </header>

          <TradeAccess onAuthChange={onAuthChange}>
            <TradingTerminal />
          </TradeAccess>
        </div>
      </main>
    </>
  );
};

export default TradingDashboard;
