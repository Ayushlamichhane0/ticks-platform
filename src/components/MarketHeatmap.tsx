import React, { useState, useMemo } from 'react';
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
import { useMarketStore } from '../store/useMarketStore';

export interface MarketTicker {
  symbol: string;
  name: string;
  price: number;
  change: number; // percentage, e.g. +3.84 or -1.25
  marketCapB: number; // market size in billions
  peRatio: number;
  volumeM: number;
  high52: number;
  low52: number;
  sector: string;
  category: 'crypto' | 'commodities' | 'tech' | 'forex' | 'indices';
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
    name: 'Crypto & Digital Assets',
    shortName: 'CRYPTO',
    etf: 'IBIT / ETHA',
    stocks: [
      { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', price: 0, change: 0, marketCapB: 1870, peRatio: 0, volumeM: 42100, high52: 99800.00, low52: 41200.00, sector: 'Crypto', category: 'crypto', unitLabel: 'BTC' },
      { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', price: 3380.50, change: 3.42, marketCapB: 408, peRatio: 0, volumeM: 18400, high52: 4090.00, low52: 2150.00, sector: 'Crypto', category: 'crypto', unitLabel: 'ETH' },
      { symbol: 'SOL/USD', name: 'Solana / US Dollar', price: 185.20, change: 6.12, marketCapB: 88, peRatio: 0, volumeM: 8200, high52: 259.00, low52: 98.40, sector: 'Crypto', category: 'crypto', unitLabel: 'SOL' },
      { symbol: 'XRP/USD', name: 'Ripple / US Dollar', price: 1.45, change: 1.85, marketCapB: 82, peRatio: 0, volumeM: 6100, high52: 2.80, low52: 0.48, sector: 'Crypto', category: 'crypto', unitLabel: 'XRP' },
    ],
  },
  {
    id: 'commodities',
    name: 'Precious Metals & Commodities',
    shortName: 'METALS & OIL',
    etf: 'GLD / SLV / USO',
    stocks: [
      { symbol: 'GOLD', name: 'PAX Gold / US Dollar (gold-backed token)', price: 0, change: 0, marketCapB: 0, peRatio: 0, volumeM: 0, high52: 0, low52: 0, sector: 'Metals & Commodities', category: 'commodities', unitLabel: 'PAXG' },
      { symbol: 'SILVER', name: 'Silver Spot / US Dollar (XAG/USD)', price: 32.40, change: 2.85, marketCapB: 1450, peRatio: 0, volumeM: 14200, high52: 35.40, low52: 21.80, sector: 'Metals & Commodities', category: 'commodities', unitLabel: 'TROY OZ' },
      { symbol: 'WTI', name: 'WTI Crude Oil Spot', price: 71.80, change: -0.95, marketCapB: 2800, peRatio: 0, volumeM: 38200, high52: 87.50, low52: 65.20, sector: 'Metals & Commodities', category: 'commodities', unitLabel: 'BARREL' },
      { symbol: 'COPPER', name: 'High Grade Copper Spot', price: 4.35, change: 0.82, marketCapB: 980, peRatio: 0, volumeM: 9400, high52: 5.10, low52: 3.65, sector: 'Metals & Commodities', category: 'commodities', unitLabel: 'LB' },
    ],
  },
  {
    id: 'tech',
    name: 'Global Tech & MegaCap Leaders',
    shortName: 'TECH',
    etf: 'XLK / QQQ',
    stocks: [
      { symbol: 'NVDA', name: 'Nvidia Corporation', price: 143.50, change: 3.84, marketCapB: 3510, peRatio: 58.4, volumeM: 48.2, high52: 153.10, low52: 45.20, sector: 'Technology', category: 'tech', unitLabel: 'SHARE' },
      { symbol: 'AAPL', name: 'Apple Inc.', price: 234.80, change: 1.15, marketCapB: 3560, peRatio: 34.2, volumeM: 39.5, high52: 237.20, low52: 164.10, sector: 'Technology', category: 'tech', unitLabel: 'SHARE' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', price: 429.60, change: 0.85, marketCapB: 3190, peRatio: 35.8, volumeM: 21.4, high52: 468.30, low52: 366.50, sector: 'Technology', category: 'tech', unitLabel: 'SHARE' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', price: 212.40, change: 2.15, marketCapB: 2240, peRatio: 44.8, volumeM: 38.7, high52: 215.90, low52: 139.40, sector: 'Technology', category: 'tech', unitLabel: 'SHARE' },
      { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', price: 178.30, change: 1.72, marketCapB: 2210, peRatio: 24.1, volumeM: 26.5, high52: 191.70, low52: 129.20, sector: 'Technology', category: 'tech', unitLabel: 'SHARE' },
      { symbol: 'META', name: 'Meta Platforms, Inc.', price: 588.60, change: 2.40, marketCapB: 1490, peRatio: 27.5, volumeM: 16.2, high52: 602.90, low52: 279.40, sector: 'Technology', category: 'tech', unitLabel: 'SHARE' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', price: 334.80, change: 4.82, marketCapB: 1075, peRatio: 88.5, volumeM: 85.2, high52: 358.60, low52: 138.80, sector: 'Technology', category: 'tech', unitLabel: 'SHARE' },
    ],
  },
  {
    id: 'forex',
    name: 'Forex Majors & FX Pairs',
    shortName: 'FOREX',
    etf: 'FXE / UUP',
    stocks: [
      { symbol: 'EUR/USD', name: 'Euro / US Dollar', price: 1.08465, change: -0.15, marketCapB: 7500, peRatio: 0, volumeM: 95000, high52: 1.1210, low52: 1.0450, sector: 'Forex', category: 'forex', unitLabel: 'CONTRACT' },
      { symbol: 'GBP/USD', name: 'British Pound / USD', price: 1.29340, change: 0.35, marketCapB: 4200, peRatio: 0, volumeM: 62000, high52: 1.3420, low52: 1.2290, sector: 'Forex', category: 'forex', unitLabel: 'CONTRACT' },
      { symbol: 'USD/JPY', name: 'US Dollar / Yen', price: 154.680, change: 0.42, marketCapB: 5100, peRatio: 0, volumeM: 78000, high52: 161.90, low52: 140.20, sector: 'Forex', category: 'forex', unitLabel: 'CONTRACT' },
      { symbol: 'AUD/USD', name: 'Aussie Dollar / USD', price: 0.65825, change: 0.65, marketCapB: 2100, peRatio: 0, volumeM: 31000, high52: 0.6940, low52: 0.6340, sector: 'Forex', category: 'forex', unitLabel: 'CONTRACT' },
    ],
  },
  {
    id: 'indices',
    name: 'Global Stock Indices',
    shortName: 'INDICES',
    etf: 'SPY / QQQ / DIA',
    stocks: [
      { symbol: 'S&P 500', name: 'S&P 500 Benchmark Index', price: 5864.20, change: 1.12, marketCapB: 46200, peRatio: 26.4, volumeM: 125000, high52: 5910.00, low52: 4100.00, sector: 'Global Indices', category: 'indices', unitLabel: 'INDEX PT' },
      { symbol: 'NASDAQ', name: 'NASDAQ 100 Index', price: 20450.80, change: 1.84, marketCapB: 24800, peRatio: 31.8, volumeM: 98000, high52: 20700.00, low52: 14000.00, sector: 'Global Indices', category: 'indices', unitLabel: 'INDEX PT' },
      { symbol: 'NIKKEI', name: 'Nikkei 225 Japan', price: 38920.00, change: 0.95, marketCapB: 6200, peRatio: 19.5, volumeM: 41000, high52: 42400.00, low52: 31000.00, sector: 'Global Indices', category: 'indices', unitLabel: 'INDEX PT' },
      { symbol: 'FTSE 100', name: 'FTSE 100 United Kingdom', price: 8240.50, change: -0.25, marketCapB: 2900, peRatio: 14.8, volumeM: 22000, high52: 8480.00, low52: 7350.00, sector: 'Global Indices', category: 'indices', unitLabel: 'INDEX PT' },
    ],
  },
];

// Helper to determine performance color class
function getPerformanceColor(change: number) {
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
  const marketState = useMarketStore();
  const btcSessionChange = marketState.btcPrice !== null && marketState.btcSessionOpenPrice !== null
    ? +(((marketState.btcPrice - marketState.btcSessionOpenPrice) / marketState.btcSessionOpenPrice) * 100).toFixed(2)
    : null;
  const goldSessionChange = marketState.goldPrice !== null && marketState.goldSessionOpenPrice !== null
    ? +(((marketState.goldPrice - marketState.goldSessionOpenPrice) / marketState.goldSessionOpenPrice) * 100).toFixed(2)
    : null;
  const sectors = useMemo(
    () => GLOBAL_MARKET_SECTORS.map((sector) => ({
      ...sector,
      stocks: sector.stocks.map((stock) => {
        if (stock.symbol === 'BTC/USD') {
          return {
            ...stock,
            price: marketState.btcPrice ?? 0,
            change: btcSessionChange ?? 0,
          };
        }
        if (stock.symbol === 'GOLD') {
          return {
            ...stock,
            price: marketState.goldPrice ?? 0,
            change: goldSessionChange ?? 0,
          };
        }
        return stock;
      }),
    })),
    [btcSessionChange, goldSessionChange, marketState.btcPrice, marketState.goldPrice]
  );
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<MarketTicker | null>(null);
  const [metricView, setMetricView] = useState<'change' | 'cap' | 'pe'>('change');

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

  // Aggregate Market Stats
  const { totalCapTrillion, avgGain, gainersCount, losersCount } = useMemo(() => {
    let totalCap = 0;
    let sumGain = 0;
    let count = 0;
    let gainers = 0;
    let losers = 0;

    sectors.forEach((sec) => {
      sec.stocks.forEach((s) => {
        totalCap += s.marketCapB;
        sumGain += s.change;
        count++;
        if (s.change >= 0) gainers++;
        else losers++;
      });
    });

    return {
      totalCapTrillion: (totalCap / 1000).toFixed(2),
      avgGain: (sumGain / (count || 1)).toFixed(2),
      gainersCount: gainers,
      losersCount: losers,
    };
  }, [sectors]);

  // Action: Launch asset directly in the Live Terminal
  const handleTradeAssetInTerminal = (symbol: string) => {
    setSelectedStock(null);
    if (onSelectAssetForTerminal) {
      // Convert Heatmap ticker name to terminal symbol if needed
      let termSymbol = symbol;
      if (symbol === 'GOLD') termSymbol = 'GOLD';
      if (symbol === 'SILVER') termSymbol = 'SILVER';
      onSelectAssetForTerminal(termSymbol);
    }
  };

  const selectedStockIsBtc = selectedStock?.symbol === 'BTC/USD';
  const selectedStockIsGold = selectedStock?.symbol === 'GOLD';
  const selectedStockIsLive = selectedStockIsBtc || selectedStockIsGold;
  const selectedStockPrice = selectedStockIsBtc
    ? marketState.btcPrice
    : selectedStockIsGold ? marketState.goldPrice : selectedStock?.price ?? null;
  const selectedStockChange = selectedStockIsBtc
    ? btcSessionChange
    : selectedStockIsGold ? goldSessionChange : selectedStock?.change ?? null;

  return (
    <section id="heatmap" className="w-full py-10 sm:py-14 border-b border-white/10">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-white/10 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
          <span className="font-silkscreen text-sm sm:text-base text-white tracking-wider">
            02. GLOBAL MARKET HEATMAP // BINANCE BTC LIVE
          </span>
          <span className="font-mono-geist text-[10px] text-white/50 border border-white/15 px-2 py-0.5">
            BTC + PAXG LIVE · OTHER TILES REFERENCE DATA
          </span>
        </div>

        {/* Live Pulse & Metrics Toggle */}
        <div className="flex items-center gap-2 font-mono-geist text-xs flex-wrap">
          <div className="flex items-center bg-[#0e0e0e] border border-white/15 p-0.5">
            <button
              onClick={() => setMetricView('change')}
              className={`px-2 py-1 text-[10px] font-silkscreen transition-all cursor-pointer ${
                metricView === 'change' ? 'bg-white text-black font-bold' : 'text-white/50 hover:text-white'
              }`}
            >
              % CHG
            </button>
            <button
              onClick={() => setMetricView('cap')}
              className={`px-2 py-1 text-[10px] font-silkscreen transition-all cursor-pointer ${
                metricView === 'cap' ? 'bg-white text-black font-bold' : 'text-white/50 hover:text-white'
              }`}
            >
              MARKET WEIGHT
            </button>
          </div>

          <span className="px-2.5 py-1.5 border border-white/15 inline-flex items-center gap-1.5 text-[11px]">
            <Zap className={`w-3 h-3 ${marketState.btcStatus === 'connected' && marketState.goldStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="font-silkscreen text-[10px]">
              BTC {marketState.btcStatus.toUpperCase()} · PAXG {marketState.goldStatus.toUpperCase()}
            </span>
          </span>
        </div>
      </div>

      {/* Overview Stat Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono-geist">
        <div className="bg-[#0a0a0a] border border-white/10 p-3">
          <div className="text-[10px] text-white/50 uppercase">TOTAL TRACKED LIQUIDITY</div>
          <div className="font-silkscreen text-base sm:text-lg text-white mt-0.5">${totalCapTrillion}T</div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-3">
          <div className="text-[10px] text-white/50 uppercase">GLOBAL BREADTH</div>
          <div className="font-silkscreen text-base sm:text-lg mt-0.5 text-emerald-400">
            {gainersCount} <span className="text-white/40 text-xs">BULL</span> / {losersCount} <span className="text-white/40 text-xs">BEAR</span>
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-3">
          <div className="text-[10px] text-white/50 uppercase">WEIGHTED AVG CHANGE</div>
          <div className={`font-silkscreen text-base sm:text-lg mt-0.5 ${+avgGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {+avgGain >= 0 ? '+' : ''}{avgGain}%
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-white/10 p-3">
          <div className="text-[10px] text-white/50 uppercase">LEAD ASSETS</div>
          <div className="font-silkscreen text-base sm:text-lg text-amber-400 mt-0.5">GOLD &amp; BTC</div>
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
            placeholder="FIND GOLD, BTC, NVDA..."
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
            const sortedStocks = [...sector.stocks].sort((a, b) => b.marketCapB - a.marketCapB);

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

                {/* Weighted Treemap Grid for Sector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {sortedStocks.map((stock) => {
                    const isLiveAsset = stock.symbol === 'BTC/USD' || stock.symbol === 'GOLD';
                    const isLivePriceUnavailable = isLiveAsset && (
                      stock.symbol === 'BTC/USD'
                        ? marketState.btcPrice === null
                        : marketState.goldPrice === null
                    );
                    const colorStyle = getPerformanceColor(isLivePriceUnavailable ? 0 : stock.change);
                    const isGiant = stock.marketCapB > 2000;
                    const isLarge = stock.marketCapB > 400 && !isGiant;
                    
                    let colSpanClass = 'col-span-1 sm:col-span-1 lg:col-span-2 min-h-[95px]';
                    if (isGiant) {
                      colSpanClass = 'col-span-2 sm:col-span-2 lg:col-span-4 min-h-[120px]';
                    } else if (isLarge) {
                      colSpanClass = 'col-span-2 sm:col-span-2 lg:col-span-3 min-h-[105px]';
                    }

                    const isSelected = selectedStock?.symbol === stock.symbol;

                    return (
                      <div
                        key={stock.symbol}
                        onClick={() => setSelectedStock(stock)}
                        className={`relative ${colSpanClass} ${colorStyle.bg} border ${
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
                              {stock.name}
                            </span>
                          </div>
                          
                          {/* Live Performance Badge */}
                          <div
                            className={`font-mono-geist text-[10px] font-bold px-1.5 py-0.5 text-white flex items-center gap-0.5 ${
                              isLivePriceUnavailable
                                ? 'bg-neutral-900 border border-neutral-600/40'
                                : stock.change >= 0
                                  ? 'bg-emerald-950/90 border border-emerald-500/40'
                                  : 'bg-rose-950/90 border border-rose-500/40'
                            }`}
                          >
                            {isLivePriceUnavailable
                              ? 'WAITING'
                              : `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%`}
                          </div>
                        </div>

                        {/* Center / Bottom: Price & Secondary Metric */}
                        <div className="pt-2 flex items-end justify-between font-mono-geist">
                          <div>
                            <span className="text-white text-xs sm:text-sm font-semibold tracking-tight">
                              {isLivePriceUnavailable
                                ? '--'
                                : `$${stock.price.toLocaleString('en-US', { minimumFractionDigits: stock.price < 10 ? 3 : 2 })}`}
                            </span>
                          </div>
                          <div className="text-right text-[10px] text-white/70">
                            {metricView === 'change' && (
                              <span>
                                {isLivePriceUnavailable
                                  ? 'WAITING FOR LIVE DATA'
                                  : `${stock.change >= 0 ? '▲' : '▼'} ${Math.abs(stock.change).toFixed(2)}%${isLiveAsset ? ' SESSION' : ''}`}
                              </span>
                            )}
                            {metricView === 'cap' && <span>${stock.marketCapB}B</span>}
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
            CLICK ANY TILE (GOLD, BITCOIN, TECH) TO INSPECT AND TRADE IN DEMO TERMINAL
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
                    {selectedStock.sector}
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
                  {selectedStockIsLive
                    ? `BINANCE ${selectedStockIsBtc ? 'BTC/USDT' : 'PAXG/USDT'} LAST TRADE`
                    : 'SPOT PRICE'}
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
                      <span>{selectedStockChange >= 0 ? '+' : ''}{selectedStockChange.toFixed(2)}%{selectedStockIsLive ? ' SESSION' : ''}</span>
                    </>
                  )}
              </div>
            </div>

            {/* Key Fundamentals Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#111111] border border-white/10 p-3">
                <span className="text-[10px] text-white/40 block">MARKET SIZE / WEIGHT</span>
                <span className="font-silkscreen text-sm text-white mt-0.5 block">
                  ${selectedStock.marketCapB.toLocaleString()} B
                </span>
              </div>
              <div className="bg-[#111111] border border-white/10 p-3">
                <span className="text-[10px] text-white/40 block">UNIT INSTRUMENT</span>
                <span className="font-silkscreen text-sm text-white mt-0.5 block">
                  {selectedStock.unitLabel}
                </span>
              </div>
              <div className="bg-[#111111] border border-white/10 p-3">
                <span className="text-[10px] text-white/40 block">52-WEEK RANGE</span>
                <span className="text-white text-xs font-semibold mt-0.5 block">
                  ${selectedStock.low52} — ${selectedStock.high52}
                </span>
              </div>
              <div className="bg-[#111111] border border-white/10 p-3">
                <span className="text-[10px] text-white/40 block">24H LIQUIDITY VOLUME</span>
                <span className="text-white text-xs font-semibold mt-0.5 block">
                  ${selectedStock.volumeM}M
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
