import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Filter,
  RefreshCw,
  Search,
  Maximize2,
  X,
  Zap,
  Info,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { toMarketSymbol, useMarketStore } from '../store/useMarketStore';
import { useTradingStore } from '../store/useTradingStore';

// Fallback placeholder price used when the live API is unavailable (e.g. rate-limited
// with a 502 error) so the heatmap grid never collapses or crashes on missing data.
const FALLBACK_HEATMAP_PRICE = 100;

export interface MarketTicker {
  symbol: string;
  feedSymbol?: string;
  name: string;
  price: number | null;
  change: number | null;
  category: 'crypto' | 'metal';
  unitLabel: string;
}

export interface SectorGroup {
  id: string;
  name: string;
  shortName: string;
  etf: string;
  stocks: MarketTicker[];
}

const GLOBAL_MARKET_SECTORS: SectorGroup[] = [
  {
    id: 'crypto',
    name: 'Crypto, Metals & Digital Assets',
    shortName: 'MARKETS',
    etf: 'BINANCE / GOLD API LIVE',
    stocks: [
      { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', price: null, change: null, category: 'crypto', unitLabel: 'BTC' },
      { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', price: null, change: null, category: 'crypto', unitLabel: 'ETH' },
      { symbol: 'SOL/USD', name: 'Solana / US Dollar', price: null, change: null, category: 'crypto', unitLabel: 'SOL' },
      { symbol: 'XRP/USD', name: 'XRP / US Dollar', price: null, change: null, category: 'crypto', unitLabel: 'XRP' },
      { symbol: 'PAXG/USD', feedSymbol: 'PAXGUSDT', name: 'PAXG / GOLD', price: null, change: null, category: 'crypto', unitLabel: 'PAXG' },
      { symbol: 'XAU/USD', feedSymbol: 'XAUUSD', name: 'XAU / GOLD (SPOT GOLD)', price: null, change: null, category: 'metal', unitLabel: 'XAU' },
    ],
  },
];

// Helper to determine performance color class
function getPerformanceColor(change: number | null) {
  if (change === null) return { bg: 'bg-[#262626]', border: 'border-neutral-600/30', text: 'text-neutral-300' };
  if (change >= 3.0) return { bg: 'bg-[#065f46]', border: 'border-emerald-500/50', text: 'text-emerald-200' };
  if (change >= 1.5) return { bg: 'bg-[#047857]', border: 'border-emerald-600/40', text: 'text-emerald-100' };
  if (change >= 0.3) return { bg: 'bg-[#064e3b]', border: 'border-emerald-700/30', text: 'text-emerald-300' };
  if (change > -0.3) return { bg: 'bg-[#262626]', border: 'border-neutral-600/30', text: 'text-neutral-300' };
  if (change > -1.5) return { bg: 'bg-[#7f1d1d]', border: 'border-rose-700/30', text: 'text-rose-300' };
  if (change > -3.0) return { bg: 'bg-[#991b1b]', border: 'border-rose-600/40', text: 'text-rose-100' };
  return { bg: 'bg-[#881337]', border: 'border-rose-500/50', text: 'text-rose-200' };
}

interface MarketHeatmapProps {
  onSelectAssetForTerminal?: (symbol: string) => void;
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ onSelectAssetForTerminal }) => {
  const selectedSymbol = useMarketStore((store) => store.selectedSymbol);
  const livePrice = useMarketStore((store) => store.livePrice);
  const sessionOpenPrice = useMarketStore((store) => store.sessionOpenPrice);
  const connectionStatus = useMarketStore((store) => store.status);
  const setSelectedSymbol = useMarketStore((store) => store.setSelectedSymbol);
  // Live REST prices streamed into the trading store (may be empty when the API is
  // rate limited / returning 502, which is why a fallback price is required below).
  const prices = useTradingStore((store) => store.prices);

  /**
   * Resolves a displayable price for a heatmap tile. If `prices[symbol]` is
   * undefined or 0 (e.g. the live API hit a rate limit and returned a 502), fall
   * back to a placeholder price so the grid never collapses or crashes.
   */
  const getHeatmapPrice = (symbol: string): number => {
    const price = prices[symbol];
    if (price === undefined || price === null || !Number.isFinite(price) || price <= 0) {
      return FALLBACK_HEATMAP_PRICE;
    }
    return price;
  };

  const sessionChange = livePrice !== null && sessionOpenPrice !== null
    ? +(((livePrice - sessionOpenPrice) / sessionOpenPrice) * 100).toFixed(2)
    : null;
  const sectors = useMemo(
    () => GLOBAL_MARKET_SECTORS.map((sector) => ({
      ...sector,
      stocks: sector.stocks.map((stock) => {
        const feedSymbol = stock.feedSymbol ?? toMarketSymbol(stock.symbol);
        if (feedSymbol === selectedSymbol) {
          return {
            ...stock,
            price: livePrice,
            change: sessionChange,
          };
        }
        return stock;
      }),
    })),
    [livePrice, selectedSymbol, sessionChange]
  );

  // Debug helper: print the resolved heatmap data (including any fallback prices)
  // so we can inspect it in the browser console while chasing the 502 rate-limit issue.
  const heatmapData = useMemo(
    () =>
      GLOBAL_MARKET_SECTORS.flatMap((sector) =>
        sector.stocks.map((stock) => {
          const feedSymbol = stock.feedSymbol ?? toMarketSymbol(stock.symbol);
          const rawPrice = feedSymbol === selectedSymbol ? livePrice : prices[feedSymbol];
          return {
            symbol: stock.symbol,
            feedSymbol,
            rawPrice: rawPrice ?? null,
            displayPrice: getHeatmapPrice(feedSymbol),
            usedFallback: rawPrice === undefined || rawPrice === null || rawPrice === 0,
          };
        })
      ),
    [prices, selectedSymbol, livePrice]
  );

  useEffect(() => {
    console.log('[MarketHeatmap] heatmap data:', heatmapData);
  }, [heatmapData]);

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<MarketTicker | null>(null);

  // Filtered sectors list
  const filteredSectors = useMemo(() => {
    return sectors
      .filter((sec) => activeFilter === 'all' || sec.id === activeFilter)
      .map((sec) => {
        if (!searchQuery.trim()) return sec;
        const q = searchQuery.toLowerCase();
        return {
          ...sec,
          stocks: sec.stocks.filter(
            (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
          ),
        };
      })
      .filter((sec) => sec.stocks.length > 0);
  }, [sectors, activeFilter, searchQuery]);

  // Action: Launch asset directly in the Live Terminal
  const handleTradeAssetInTerminal = (symbol: string) => {
    setSelectedStock(null);
    setSelectedSymbol(toMarketSymbol(symbol));
    if (onSelectAssetForTerminal) {
      onSelectAssetForTerminal(symbol);
    }
  };

  const selectedStockFeedSymbol = selectedStock
    ? selectedStock.feedSymbol ?? toMarketSymbol(selectedStock.symbol)
    : null;
  const selectedStockIsSelectedMarket = selectedStockFeedSymbol === selectedSymbol;
  const selectedStockPrice = selectedStockIsSelectedMarket
    ? livePrice
    : selectedStock?.price ?? null;
  const selectedStockChange = selectedStockIsSelectedMarket
    ? sessionChange
    : selectedStock?.change ?? null;

  return (
    <section id="heatmap" className="w-full py-10 sm:py-14 border-b border-white/10">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-white/10 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
          <span className="font-silkscreen text-sm sm:text-base text-white tracking-wider">
            02. CRYPTO MARKET HEATMAP // LIVE REST PRICE DATA
          </span>
          <span className="font-mono-geist text-[10px] text-white/50 border border-white/15 px-2 py-0.5">
            SELECT A CRYPTO TILE TO LOAD ITS LIVE PRICE
          </span>
        </div>

        {/* Live feed status */}
        <div className="flex items-center gap-2 font-mono-geist text-xs flex-wrap">
          <span className="px-2.5 py-1.5 border border-white/15 inline-flex items-center gap-1.5 text-[11px]">
            <Zap className={`w-3 h-3 ${connectionStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="font-silkscreen text-[10px]">{selectedSymbol} {connectionStatus.toUpperCase()}</span>
          </span>
        </div>
      </div>

      {/* Overview Stat Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono-geist">
        <div className="bg-[#0a0a0a] border border-white/10 p-3">
          <div className="text-[10px] text-white/50 uppercase">SUPPORTED MARKETS</div>
          <div className="font-silkscreen text-base sm:text-lg text-white mt-0.5">{sectors.reduce((count, sector) => count + sector.stocks.length, 0)}</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-3">
          <div className="text-[10px] text-white/50 uppercase">SELECTED MARKET</div>
          <div className="font-silkscreen text-base sm:text-lg mt-0.5 text-white">{selectedSymbol}</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-3">
          <div className="text-[10px] text-white/50 uppercase">LIVE PRICE</div>
          <div className="font-silkscreen text-base sm:text-lg mt-0.5 text-white">{livePrice === null ? '--' : `$${livePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-3">
          <div className="text-[10px] text-white/50 uppercase">DATA SOURCE</div>
          <div className="font-silkscreen text-base sm:text-lg text-amber-400 mt-0.5">REST API</div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 font-mono-geist text-xs">
        
        {/* Sector Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 font-silkscreen text-[10px] uppercase border transition-colors cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-white text-black border-white font-bold'
                : 'bg-[#0a0a0a] border-white/15 text-white/60 hover:text-white hover:border-white/40'
            }`}
          >
            ALL ASSETS
          </button>
          {sectors.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveFilter(sec.id)}
              className={`px-3 py-1.5 font-silkscreen text-[10px] uppercase border transition-colors cursor-pointer whitespace-nowrap ${
                activeFilter === sec.id
                  ? 'bg-white text-black border-white font-bold'
                  : 'bg-[#0a0a0a] border-white/15 text-white/60 hover:text-white hover:border-white/40'
              }`}
            >
              {sec.shortName}
            </button>
          ))}
        </div>

        {/* Quick Ticker Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="FIND BTC, ETH, SOL, XRP, XAU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-white/15 pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white font-mono-geist"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Main Treemap Grid */}
      <div className="bg-[#050505] border border-white/15 p-4 sm:p-5">
        
        {/* Treemap Sectors Stack */}
        <div className="space-y-6">
          {filteredSectors.map((sector) => {
            const sortedStocks = sector.stocks;

            return (
              <div key={sector.id} className="space-y-2">
                {/* Sector Header Strip */}
                <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-mono-geist text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-silkscreen text-xs text-white uppercase tracking-wider">
                      {sector.name}
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 border border-amber-500/30">
                      {sector.etf}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {sortedStocks.map((stock) => {
                    const coinSymbol = stock.feedSymbol ?? toMarketSymbol(stock.symbol);
                    const isSelectedMarket = coinSymbol === selectedSymbol;
                    const isLivePriceUnavailable = isSelectedMarket && livePrice === null;
                    const colorStyle = getPerformanceColor(stock.change);

                    const isSelected = isSelectedMarket;

                    return (
                      <div
                        key={stock.symbol}
                        onClick={() => {
                          setSelectedStock(stock);
                          if (coinSymbol) {
                            setSelectedSymbol(coinSymbol);
                            onSelectAssetForTerminal?.(stock.symbol);
                          }
                        }}
                        className={`relative min-h-[110px] ${colorStyle.bg} border ${
                          isSelected ? 'border-white ring-2 ring-white/50 z-10' : colorStyle.border
                        } p-3 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-[1.015] hover:z-10 group select-none overflow-hidden`}
                      >
                        {/* Top row: Symbol and Tag */}
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-silkscreen text-base sm:text-lg font-bold text-white tracking-wider block">
                              {stock.symbol}
                            </span>
                            <span className="font-mono-geist text-[9.5px] text-white/60 truncate max-w-[130px] block">
                              {stock.name} · {stock.feedSymbol ?? toMarketSymbol(stock.symbol)}
                            </span>
                          </div>
                          
                          {/* Live Performance Badge */}
                          <div
                            className={`font-mono-geist text-[10px] font-bold px-1.5 py-0.5 text-white flex items-center gap-0.5 ${
                              isLivePriceUnavailable
                                ? 'bg-neutral-900 border border-neutral-600/40'
                                : stock.change === null
                                  ? 'bg-neutral-900 border border-neutral-600/40'
                                  : stock.change >= 0
                                    ? 'bg-emerald-950/90 border border-emerald-500/40'
                                    : 'bg-rose-950/90 border border-rose-500/40'
                            }`}
                          >
                            {isLivePriceUnavailable
                                ? 'WAITING'
                                : stock.change === null
                                  ? 'NO LIVE DATA'
                                  : `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%`}
                          </div>
                        </div>

                        {/* Center / Bottom: Price & Secondary Metric */}
                        <div className="pt-2 flex items-end justify-between font-mono-geist">
                          <div>
                            <span className="text-white text-xs sm:text-sm font-semibold tracking-tight">
                              {isSelectedMarket && livePrice !== null
                                ? `$${livePrice.toLocaleString('en-US', { minimumFractionDigits: livePrice < 10 ? 3 : 2 })}`
                                : 'Select to load'}
                            </span>
                          </div>
                          <div className="text-right text-[10px] text-white/70">
                            <span>
                              {isLivePriceUnavailable
                                ? 'WAITING FOR LIVE DATA'
                                : isSelectedMarket && sessionChange !== null
                                  ? `${sessionChange >= 0 ? '▲' : '▼'} ${Math.abs(sessionChange).toFixed(2)}% SESSION`
                                  : 'CLICK TO LOAD LIVE PRICE'}
                            </span>
                          </div>
                        </div>

                        {/* Hover Overlay indicator */}
                        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Heatmap Legend */}
        <div className="mt-8 pt-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 font-mono-geist text-xs text-white/60">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase">COLOR SCALE:</span>
            <div className="flex items-center gap-1 text-[9px] font-mono-geist text-white">
              <span className="px-2 py-0.5 bg-[#881337]">&lt; -3%</span>
              <span className="px-2 py-0.5 bg-[#991b1b]">-2%</span>
              <span className="px-2 py-0.5 bg-[#7f1d1d]">-1%</span>
              <span className="px-2 py-0.5 bg-[#262626]">0%</span>
              <span className="px-2 py-0.5 bg-[#064e3b]">+1%</span>
              <span className="px-2 py-0.5 bg-[#047857]">+2%</span>
              <span className="px-2 py-0.5 bg-[#065f46]">&gt; +3%</span>
            </div>
          </div>

          <div className="text-[10px] text-white/40">
            CLICK A CRYPTO TILE TO VIEW ITS LIVE PRICE AND TRADE IN THE DEMO TERMINAL
          </div>
        </div>

      </div>

      {/* Stock / Asset Inspector Modal */}
      {selectedStock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs font-mono-geist"
          onClick={() => setSelectedStock(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0a0a0a] border border-white/20 p-6 space-y-6 relative text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-silkscreen text-2xl font-bold text-white tracking-wider">
                    {selectedStock.symbol}
                  </span>
                  <span className="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 uppercase font-bold">
                    CRYPTO
                  </span>
                </div>
                <div className="text-xs text-white/60 mt-1">{selectedStock.name}</div>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Price & Performance Hero */}
            <div className="flex items-baseline justify-between bg-black border border-white/10 p-4">
              <div>
                <div className="text-[10px] text-white/40 uppercase">
                  REST {selectedStockFeedSymbol} PRICE
                </div>
                <div className="font-silkscreen text-3xl font-bold text-white mt-1">
                  {selectedStockPrice === null
                    ? '--'
                    : `$${selectedStockPrice.toLocaleString('en-US', { minimumFractionDigits: selectedStockPrice < 10 ? 3 : 2 })}`}
                </div>
              </div>
              <div
                className={`font-silkscreen text-base font-bold px-3 py-1.5 flex items-center gap-1 ${
                  selectedStockChange === null
                    ? 'bg-neutral-900 text-white/50 border border-neutral-600/40'
                    : selectedStockChange >= 0
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {selectedStockChange === null
                  ? <span>WAITING FOR LIVE DATA</span>
                  : (
                    <>
                      {selectedStockChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span>{selectedStockChange >= 0 ? '+' : ''}{selectedStockChange.toFixed(2)}% SESSION</span>
                    </>
                  )}
              </div>
            </div>

            {/* Market data details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#111111] border border-white/10 p-3">
                <span className="text-[10px] text-white/40 block">API SYMBOL</span>
                <span className="font-silkscreen text-sm text-white mt-0.5 block">
                  {selectedStockFeedSymbol}
                </span>
              </div>
              <div className="bg-[#111111] border border-white/10 p-3">
                <span className="text-[10px] text-white/40 block">UNIT INSTRUMENT</span>
                <span className="font-silkscreen text-sm text-white mt-0.5 block">
                  {selectedStock.unitLabel}
                </span>
              </div>
            </div>

            {/* Actions: Trade in Terminal */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => handleTradeAssetInTerminal(selectedStock.symbol)}
                className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-black font-silkscreen text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>TRADE {selectedStock.symbol} IN TERMINAL</span>
              </button>
              <button
                onClick={() => setSelectedStock(null)}
                className="py-3 px-5 border border-white/20 text-white font-silkscreen text-xs font-bold uppercase hover:bg-white/10 transition-colors cursor-pointer text-center"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default MarketHeatmap;
