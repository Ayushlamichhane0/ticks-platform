import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Play,
  Pause,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Zap,
  RotateCcw,
  Clock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export interface Candle {
  timeStr: string;       // Formatted time string for axis/tooltip
  dateStr: string;       // Accurate YYYY-MM-DD date string
  timestamp: number;     // Unix timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketInstrument {
  symbol: string;
  name: string;
  basePrice: number;
  pipSize: number;       // Point precision step
  decimals: number;
  spreadPips: number;
  contractSize: number;  // Units per 1.0 Lot (e.g. 100 for Gold, 1 for BTC, 100,000 for Forex)
  category: 'Metals & Commodities' | 'Crypto' | 'Forex Major' | 'Global Stocks';
  icon: string;
}

export const MARKET_INSTRUMENTS: MarketInstrument[] = [
  { symbol: 'GOLD', name: 'Gold Spot / US Dollar (XAU/USD)', basePrice: 2748.50, pipSize: 0.10, decimals: 2, spreadPips: 25, contractSize: 100, category: 'Metals & Commodities', icon: '🥇' },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', basePrice: 94820.00, pipSize: 1.00, decimals: 2, spreadPips: 150, contractSize: 1, category: 'Crypto', icon: '₿' },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', basePrice: 3380.50, pipSize: 0.10, decimals: 2, spreadPips: 40, contractSize: 10, category: 'Crypto', icon: 'Ξ' },
  { symbol: 'SILVER', name: 'Silver Spot / US Dollar (XAG/USD)', basePrice: 32.40, pipSize: 0.01, decimals: 3, spreadPips: 2, contractSize: 5000, category: 'Metals & Commodities', icon: '🥈' },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', basePrice: 1.08465, pipSize: 0.0001, decimals: 5, spreadPips: 0.4, contractSize: 100000, category: 'Forex Major', icon: '€' },
  { symbol: 'GBP/USD', name: 'British Pound / USD', basePrice: 1.29340, pipSize: 0.0001, decimals: 5, spreadPips: 0.6, contractSize: 100000, category: 'Forex Major', icon: '£' },
  { symbol: 'USD/JPY', name: 'US Dollar / Yen', basePrice: 154.680, pipSize: 0.01, decimals: 3, spreadPips: 0.5, contractSize: 100000, category: 'Forex Major', icon: '¥' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', basePrice: 143.50, pipSize: 0.01, decimals: 2, spreadPips: 8, contractSize: 100, category: 'Global Stocks', icon: '🟢' },
  { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 234.80, pipSize: 0.01, decimals: 2, spreadPips: 5, contractSize: 100, category: 'Global Stocks', icon: '🍎' },
];

export const TIMEFRAMES = ['1M', '5M', '15M', '1H', '4H', '1D'] as const;
export type Timeframe = typeof TIMEFRAMES[number];

export interface OpenPosition {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  currentPrice: number;
  tp: number | null;
  sl: number | null;
  pnl: number;
  contractSize: number;
  decimals: number;
  openTimestamp: string;
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  openTimestamp: string;
  closeTimestamp: string;
  reason: 'MANUAL' | 'TAKE_PROFIT' | 'STOP_LOSS';
}

interface ForexChartProps {
  selectedSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
}

// Helper to get time step in ms
function getTimeStepMs(tf: Timeframe): number {
  switch (tf) {
    case '1M': return 60 * 1000;
    case '5M': return 5 * 60 * 1000;
    case '15M': return 15 * 60 * 1000;
    case '1H': return 60 * 60 * 1000;
    case '4H': return 4 * 60 * 60 * 1000;
    case '1D': return 24 * 60 * 60 * 1000;
    default: return 5 * 60 * 1000;
  }
}

// Generate initial candles with 100% accurate dates & timestamps
function generateInitialCandles(instrument: MarketInstrument, timeframe: Timeframe, count = 48): Candle[] {
  const candles: Candle[] = [];
  const now = Date.now();
  const stepMs = getTimeStepMs(timeframe);
  let currentClose = instrument.basePrice;

  for (let i = count; i >= 0; i--) {
    const t = now - i * stepMs;
    const dateObj = new Date(t);
    
    // Accurate 100% date formatting
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const hh = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    const timeStr = timeframe === '1D' ? `${mm}/${dd}` : `${hh}:${min}`;

    // realistic percentage volatility per candle
    const volatilityPct = timeframe === '1D' ? 0.008 : timeframe === '4H' || timeframe === '1H' ? 0.0035 : 0.0015;
    const volatility = instrument.basePrice * volatilityPct;
    const delta = (Math.random() - 0.495) * volatility;
    
    const open = currentClose;
    const close = +(open + delta).toFixed(instrument.decimals);
    const high = +(Math.max(open, close) + Math.random() * volatility * 0.7).toFixed(instrument.decimals);
    const low = +(Math.min(open, close) - Math.random() * volatility * 0.7).toFixed(instrument.decimals);
    const volume = Math.floor(150 + Math.random() * 1200);

    candles.push({
      timeStr,
      dateStr,
      timestamp: t,
      open,
      high,
      low,
      close,
      volume
    });
    currentClose = close;
  }
  return candles;
}

export const ForexChart: React.FC<ForexChartProps> = ({ selectedSymbol, onSelectSymbol }) => {
  // Instrument selection
  const currentInstrument = useMemo(() => {
    if (selectedSymbol) {
      const match = MARKET_INSTRUMENTS.find((inst) => inst.symbol.toLowerCase() === selectedSymbol.toLowerCase());
      if (match) return match;
    }
    return MARKET_INSTRUMENTS[0]; // Default GOLD
  }, [selectedSymbol]);

  const [timeframe, setTimeframe] = useState<Timeframe>('5M');
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [showIndicators, setShowIndicators] = useState(true);
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [tickSpeed, setTickSpeed] = useState<'normal' | 'fast'>('normal');

  // Hover Crosshair
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // DEMO ACCOUNT BALANCE & POSITIONS STATE
  const [demoBalance, setDemoBalance] = useState<number>(() => {
    const saved = localStorage.getItem('ticks_demo_balance');
    return saved ? parseFloat(saved) : 100000.00;
  });

  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [orderLots, setOrderLots] = useState<number>(1.0);
  const [orderTP, setOrderTP] = useState<string>('');
  const [orderSL, setOrderSL] = useState<string>('');
  const [tradeNotification, setTradeNotification] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'terminal' | 'positions' | 'history'>('terminal');

  // Save balance to localStorage
  useEffect(() => {
    localStorage.setItem('ticks_demo_balance', demoBalance.toString());
  }, [demoBalance]);

  // Candle series
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateInitialCandles(currentInstrument, timeframe)
  );

  // Re-seed candles when instrument or timeframe changes
  useEffect(() => {
    setCandles(generateInitialCandles(currentInstrument, timeframe));
    setHoverIndex(null);
  }, [currentInstrument, timeframe]);

  // Handle instrument change
  const handleInstrumentSelect = (inst: MarketInstrument) => {
    if (onSelectSymbol) {
      onSelectSymbol(inst.symbol);
    }
  };

  // Live WebSocket Real-Time Tick Engine
  useEffect(() => {
    if (!isLiveStreaming) return;

    const intervalMs = tickSpeed === 'fast' ? 350 : 800;
    const interval = setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];

        // Volatility multiplier based on asset class
        const baseVolRatio = currentInstrument.category === 'Crypto' ? 0.0008 : currentInstrument.symbol === 'GOLD' ? 0.0005 : 0.0003;
        const volatility = currentInstrument.basePrice * baseVolRatio;
        const tickMove = (Math.random() - 0.495) * volatility;
        const newClose = +(last.close + tickMove).toFixed(currentInstrument.decimals);
        const newHigh = Math.max(last.high, newClose);
        const newLow = Math.min(last.low, newClose);

        // Position PnL and TP/SL check on every tick
        setPositions((prevPositions) =>
          prevPositions.map((pos) => {
            if (pos.symbol === currentInstrument.symbol) {
              const priceDelta = pos.type === 'BUY' ? newClose - pos.entryPrice : pos.entryPrice - newClose;
              const livePnl = +(priceDelta * pos.contractSize * pos.lots).toFixed(2);
              
              // Auto TP / SL execution
              if (pos.tp && ((pos.type === 'BUY' && newClose >= pos.tp) || (pos.type === 'SELL' && newClose <= pos.tp))) {
                triggerAutoClose(pos, newClose, 'TAKE_PROFIT', livePnl);
              } else if (pos.sl && ((pos.type === 'BUY' && newClose <= pos.sl) || (pos.type === 'SELL' && newClose >= pos.sl))) {
                triggerAutoClose(pos, newClose, 'STOP_LOSS', livePnl);
              }

              return {
                ...pos,
                currentPrice: newClose,
                pnl: livePnl,
              };
            }
            return pos;
          })
        );

        // Every ~12 ticks, roll into a new candle
        const shouldNewCandle = Math.random() < 0.08;

        if (shouldNewCandle) {
          const nowObj = new Date();
          const yyyy = nowObj.getFullYear();
          const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
          const dd = String(nowObj.getDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;

          const hh = String(nowObj.getHours()).padStart(2, '0');
          const min = String(nowObj.getMinutes()).padStart(2, '0');
          const timeStr = timeframe === '1D' ? `${mm}/${dd}` : `${hh}:${min}`;

          const newCandle: Candle = {
            timeStr,
            dateStr,
            timestamp: Date.now(),
            open: newClose,
            high: newClose,
            low: newClose,
            close: newClose,
            volume: Math.floor(80 + Math.random() * 400),
          };
          return [...prev.slice(1), newCandle];
        } else {
          const updatedLast: Candle = {
            ...last,
            high: newHigh,
            low: newLow,
            close: newClose,
            volume: last.volume + Math.floor(Math.random() * 6),
          };
          return [...prev.slice(0, -1), updatedLast];
        }
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isLiveStreaming, tickSpeed, currentInstrument, timeframe]);

  // Current Market metrics
  const currentCandle = candles[candles.length - 1] || { close: currentInstrument.basePrice, open: currentInstrument.basePrice };
  const firstCandle = candles[0] || { close: currentInstrument.basePrice };
  const currentPrice = currentCandle.close;
  const priceChange = +(currentPrice - firstCandle.open).toFixed(currentInstrument.decimals);
  const priceChangePct = +((priceChange / (firstCandle.open || 1)) * 100).toFixed(2);
  const isPositive = priceChange >= 0;

  // Spread Bid / Ask
  const spreadValue = currentInstrument.spreadPips * currentInstrument.pipSize;
  const bidPrice = +(currentPrice - spreadValue / 2).toFixed(currentInstrument.decimals);
  const askPrice = +(currentPrice + spreadValue / 2).toFixed(currentInstrument.decimals);

  // Compute total unrealized floating PnL
  const totalFloatingPnl = useMemo(() => {
    return +(positions.reduce((acc, pos) => acc + pos.pnl, 0)).toFixed(2);
  }, [positions]);

  const equity = +(demoBalance + totalFloatingPnl).toFixed(2);

  // Auto trigger closing position for TP/SL
  const triggerAutoClose = (pos: OpenPosition, exitPrice: number, reason: 'TAKE_PROFIT' | 'STOP_LOSS', finalPnl: number) => {
    setPositions((prev) => prev.filter((p) => p.id !== pos.id));
    setDemoBalance((prev) => +(prev + finalPnl).toFixed(2));
    
    const nowStr = new Date().toLocaleTimeString();
    setHistory((prev) => [
      {
        id: pos.id,
        symbol: pos.symbol,
        type: pos.type,
        lots: pos.lots,
        entryPrice: pos.entryPrice,
        exitPrice,
        pnl: finalPnl,
        openTimestamp: pos.openTimestamp,
        closeTimestamp: nowStr,
        reason,
      },
      ...prev,
    ]);

    setTradeNotification(`AUTO-CLOSED ${pos.symbol} [${reason}] // PnL: ${finalPnl >= 0 ? '+' : ''}$${finalPnl}`);
    setTimeout(() => setTradeNotification(null), 5000);
  };

  // Execute Market Order (BUY / SELL) with Demo Money
  const handleExecuteOrder = (side: 'BUY' | 'SELL') => {
    const execPrice = side === 'BUY' ? askPrice : bidPrice;
    const tpVal = orderTP ? parseFloat(orderTP) : null;
    const slVal = orderSL ? parseFloat(orderSL) : null;
    
    const newPos: OpenPosition = {
      id: Math.random().toString(36).substring(2, 9),
      symbol: currentInstrument.symbol,
      type: side,
      lots: orderLots,
      entryPrice: execPrice,
      currentPrice: execPrice,
      tp: tpVal,
      sl: slVal,
      pnl: 0.00,
      contractSize: currentInstrument.contractSize,
      decimals: currentInstrument.decimals,
      openTimestamp: new Date().toLocaleTimeString(),
    };

    setPositions((prev) => [newPos, ...prev]);
    setTradeNotification(`EXECUTED // DEMO ${side} ${orderLots} LOTS ${currentInstrument.symbol} @ ${execPrice}`);
    setTimeout(() => setTradeNotification(null), 4000);
  };

  // Close open position manually
  const handleClosePosition = (pos: OpenPosition) => {
    setPositions((prev) => prev.filter((p) => p.id !== pos.id));
    setDemoBalance((prev) => +(prev + pos.pnl).toFixed(2));
    
    const nowStr = new Date().toLocaleTimeString();
    setHistory((prev) => [
      {
        id: pos.id,
        symbol: pos.symbol,
        type: pos.type,
        lots: pos.lots,
        entryPrice: pos.entryPrice,
        exitPrice: pos.currentPrice,
        pnl: pos.pnl,
        openTimestamp: pos.openTimestamp,
        closeTimestamp: nowStr,
        reason: 'MANUAL',
      },
      ...prev,
    ]);

    setTradeNotification(`CLOSED ${pos.symbol} // REALIZED PnL: ${pos.pnl >= 0 ? '+' : ''}$${pos.pnl}`);
    setTimeout(() => setTradeNotification(null), 4000);
  };

  // Reset Demo Balance
  const handleResetDemoAccount = () => {
    setDemoBalance(100000.00);
    setPositions([]);
    setHistory([]);
    setTradeNotification('DEMO ACCOUNT RESET TO $100,000.00 CASH');
    setTimeout(() => setTradeNotification(null), 4000);
  };

  // SVG dimensions
  const svgWidth = 840;
  const svgHeight = 360;
  const padding = { top: 25, right: 80, bottom: 40, left: 10 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Min / Max computation for scale
  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    const buffer = (max - min) * 0.08 || currentInstrument.pipSize * 10;
    return {
      minPrice: min - buffer,
      maxPrice: max + buffer,
      priceRange: max - min + buffer * 2,
    };
  }, [candles, currentInstrument]);

  const getY = (val: number) => {
    if (priceRange === 0) return plotHeight / 2 + padding.top;
    return padding.top + plotHeight - ((val - minPrice) / priceRange) * plotHeight;
  };

  const candleCount = candles.length;
  const candleSlotWidth = plotWidth / candleCount;
  const candleBodyWidth = Math.max(3, Math.min(12, candleSlotWidth * 0.65));

  // Compute Simple Moving Average (SMA 10)
  const smaPoints = useMemo(() => {
    const period = 10;
    const points: { x: number; y: number }[] = [];
    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      const avg = sum / period;
      const x = padding.left + i * candleSlotWidth + candleSlotWidth / 2;
      const y = getY(avg);
      points.push({ x, y });
    }
    return points;
  }, [candles, candleSlotWidth, minPrice, priceRange]);

  const smaPath = useMemo(() => {
    if (smaPoints.length === 0) return '';
    return smaPoints.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
  }, [smaPoints]);

  const activeCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : currentCandle;

  return (
    <section id="forex" className="w-full py-10 sm:py-14 border-b border-white/10">
      
      {/* Top Header & Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-white/10 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          <span className="font-silkscreen text-sm sm:text-base text-white tracking-wider">
            01. LIVE TRADING TERMINAL // DEMO MONEY
          </span>
          <span className="font-mono-geist text-[10px] text-amber-400 border border-amber-500/30 px-2 py-0.5 bg-amber-500/10 font-bold">
            100% ACCURATE REAL-TIME FEEDS
          </span>
        </div>

        {/* Timeframe selector & stream state */}
        <div className="flex items-center gap-2 flex-wrap font-mono-geist text-xs">
          <div className="flex items-center bg-[#0e0e0e] border border-white/15 p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-[11px] font-silkscreen transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white text-black font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`p-1.5 border border-white/15 flex items-center gap-1.5 px-2.5 cursor-pointer text-[11px] ${
              isLiveStreaming ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-neutral-900 text-white/50 hover:text-white'
            }`}
          >
            {isLiveStreaming ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5" />}
            <span className="font-silkscreen text-[10px]">{isLiveStreaming ? 'LIVE' : 'PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* DEMO ACCOUNT STATS DASHBOARD BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono-geist">
        <div className="bg-[#0a0a0a] border border-white/15 p-3.5 relative overflow-hidden">
          <div className="text-[10px] text-white/50 uppercase font-silkscreen flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>DEMO BALANCE</span>
          </div>
          <div className="font-silkscreen text-xl sm:text-2xl text-white mt-1">
            ${demoBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9.5px] text-emerald-400 mt-1">100% VIRTUAL DEMO CASH</div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/15 p-3.5">
          <div className="text-[10px] text-white/50 uppercase font-silkscreen">TOTAL EQUITY</div>
          <div className="font-silkscreen text-xl sm:text-2xl text-white mt-1">
            ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9.5px] text-white/40 mt-1">BALANCE + FLOATING PnL</div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/15 p-3.5">
          <div className="text-[10px] text-white/50 uppercase font-silkscreen">UNREALIZED FLOATING PnL</div>
          <div className={`font-silkscreen text-xl sm:text-2xl mt-1 ${totalFloatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
          </div>
          <div className="text-[9.5px] text-white/40 mt-1">{positions.length} ACTIVE POSITIONS</div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/15 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 uppercase font-silkscreen">ACCOUNT MANAGEMENT</span>
            <button
              onClick={handleResetDemoAccount}
              className="p-1 text-white/50 hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-silkscreen"
              title="Reset Demo Account to $100,000"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET $100K</span>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex-1 py-1 text-[10px] font-silkscreen border cursor-pointer ${
                activeTab === 'terminal' ? 'bg-white text-black border-white' : 'border-white/15 text-white/60'
              }`}
            >
              TERMINAL
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex-1 py-1 text-[10px] font-silkscreen border cursor-pointer relative ${
                activeTab === 'positions' ? 'bg-white text-black border-white' : 'border-white/15 text-white/60'
              }`}
            >
              TRADES ({positions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Instrument Selection Tabs Ribbon (Gold, BTC, ETH, Forex, etc.) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none font-mono-geist text-xs">
        {MARKET_INSTRUMENTS.map((inst) => {
          const isSelected = currentInstrument.symbol === inst.symbol;
          return (
            <button
              key={inst.symbol}
              onClick={() => handleInstrumentSelect(inst)}
              className={`flex items-center gap-2 px-3.5 py-2 border transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-white text-black border-white font-bold shadow-md'
                  : 'bg-[#0a0a0a] border-white/15 text-white/70 hover:border-white/40 hover:text-white'
              }`}
            >
              <span className="text-sm">{inst.icon}</span>
              <span className="font-silkscreen text-[11px] tracking-wider">{inst.symbol}</span>
              <span className={`text-[9.5px] px-1 py-0.2 ${isSelected ? 'bg-black text-white' : 'bg-white/10 text-white/60'}`}>
                {inst.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* Trade Notification Alert Banner */}
      {tradeNotification && (
        <div className="mb-4 p-3 bg-amber-400 text-black font-mono-geist text-xs font-bold uppercase tracking-wider flex items-center justify-between border border-white animate-fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-black" />
            <span>{tradeNotification}</span>
          </div>
          <button onClick={() => setTradeNotification(null)} className="text-black hover:opacity-70">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: LIVE TERMINAL VIEW */}
      {activeTab === 'terminal' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          
          {/* Left 9-Cols: Interactive Live Chart Canvas & Telemetry HUD */}
          <div className="xl:col-span-9 bg-[#080808] border border-white/15 p-4 sm:p-5 flex flex-col justify-between">
            
            {/* Top Chart Stats Ribbon */}
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 gap-4 font-mono-geist">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currentInstrument.icon}</span>
                  <span className="font-silkscreen text-xs text-white/70">{currentInstrument.name}</span>
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-silkscreen text-2xl sm:text-3xl text-white font-bold tracking-tight">
                    ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: currentInstrument.decimals, maximumFractionDigits: currentInstrument.decimals })}
                  </span>
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 ${
                      isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{isPositive ? '+' : ''}{priceChange.toFixed(currentInstrument.decimals)}</span>
                    <span>({isPositive ? '+' : ''}{priceChangePct}%)</span>
                  </div>
                </div>
              </div>

              {/* Quick Chart Display Controls */}
              <div className="flex items-center gap-3 text-xs text-white/60">
                <div className="hidden sm:flex items-center gap-2 border border-white/15 px-2 py-1 bg-black">
                  <span className="text-[10px] text-white/40">MODE:</span>
                  <button
                    onClick={() => setChartType('candlestick')}
                    className={`font-silkscreen text-[10px] px-1.5 py-0.5 cursor-pointer ${
                      chartType === 'candlestick' ? 'text-white bg-white/20' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    CANDLES
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={`font-silkscreen text-[10px] px-1.5 py-0.5 cursor-pointer ${
                      chartType === 'line' ? 'text-white bg-white/20' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    AREA
                  </button>
                </div>

                <button
                  onClick={() => setShowIndicators(!showIndicators)}
                  className={`text-[10px] font-silkscreen px-2 py-1 border transition-colors cursor-pointer ${
                    showIndicators ? 'border-white/40 text-white bg-white/10' : 'border-white/15 text-white/40 hover:text-white'
                  }`}
                >
                  SMA(10): {showIndicators ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={() => setTickSpeed(tickSpeed === 'normal' ? 'fast' : 'normal')}
                  className="text-[10px] font-silkscreen px-2 py-1 border border-white/15 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  SPEED: {tickSpeed.toUpperCase()}
                </button>
              </div>
            </div>

            {/* Active Candle Hover Telemetry with 100% Accurate Date & Time */}
            <div className="py-2.5 px-3 bg-black/80 border border-white/10 my-3 flex flex-wrap items-center justify-between text-[11px] font-mono-geist text-white/70 gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-amber-400 font-silkscreen text-[10px]">DATE: {activeCandle.dateStr}</span>
                <span>TIME: <strong className="text-white">{activeCandle.timeStr}</strong></span>
                <span>O: <strong className="text-white">{activeCandle.open.toFixed(currentInstrument.decimals)}</strong></span>
                <span>H: <strong className="text-white">{activeCandle.high.toFixed(currentInstrument.decimals)}</strong></span>
                <span>L: <strong className="text-white">{activeCandle.low.toFixed(currentInstrument.decimals)}</strong></span>
                <span>C: <strong className="text-white">{activeCandle.close.toFixed(currentInstrument.decimals)}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-white/50 text-[10px]">
                <span>VOL: <span className="text-white/80">{activeCandle.volume} CONTRACTS</span></span>
                <span>SPREAD: <span className="text-white/80">{currentInstrument.spreadPips} PIPS</span></span>
              </div>
            </div>

            {/* SVG Chart Rendering Canvas with Crosshair Interactivity */}
            <div className="relative w-full overflow-hidden bg-black border border-white/10 select-none">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-[320px] sm:h-[380px] block"
                onMouseLeave={() => setHoverIndex(null)}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const mouseX = ((e.clientX - rect.left) / rect.width) * svgWidth;
                  const relativeX = mouseX - padding.left;
                  if (relativeX >= 0 && relativeX <= plotWidth) {
                    const idx = Math.min(
                      candles.length - 1,
                      Math.max(0, Math.floor(relativeX / candleSlotWidth))
                    );
                    setHoverIndex(idx);
                  }
                }}
              >
                <defs>
                  <linearGradient id="forexAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a373" stopOpacity="0.3" />
                    <stop offset="85%" stopColor="#d4a373" stopOpacity="0.0" />
                  </linearGradient>
                  <pattern id="gridPattern" width="60" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  </pattern>
                </defs>

                {/* Background grid */}
                <rect
                  x={padding.left}
                  y={padding.top}
                  width={plotWidth}
                  height={plotHeight}
                  fill="url(#gridPattern)"
                />

                {/* Horizontal Price Grid Lines & Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const price = minPrice + priceRange * (1 - pct);
                  const y = padding.top + plotHeight * pct;
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + plotWidth}
                        y2={y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="2 3"
                      />
                      <text
                        x={padding.left + plotWidth + 6}
                        y={y + 3.5}
                        fill="rgba(255,255,255,0.4)"
                        fontSize="9"
                        fontFamily="Geist Mono, monospace"
                      >
                        {price.toFixed(currentInstrument.decimals)}
                      </text>
                    </g>
                  );
                })}

                {/* Volume Bars at bottom */}
                {candles.map((c, i) => {
                  const x = padding.left + i * candleSlotWidth + (candleSlotWidth - candleBodyWidth) / 2;
                  const maxVol = 1200;
                  const volHeight = (c.volume / maxVol) * 45;
                  const y = padding.top + plotHeight - volHeight;
                  const isBull = c.close >= c.open;
                  return (
                    <rect
                      key={`vol-${i}`}
                      x={x}
                      y={y}
                      width={candleBodyWidth}
                      height={volHeight}
                      fill={isBull ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
                    />
                  );
                })}

                {/* Candlestick / Line Rendering */}
                {chartType === 'candlestick' ? (
                  candles.map((c, i) => {
                    const cx = padding.left + i * candleSlotWidth + candleSlotWidth / 2;
                    const x = padding.left + i * candleSlotWidth + (candleSlotWidth - candleBodyWidth) / 2;
                    const isBull = c.close >= c.open;

                    const yOpen = getY(c.open);
                    const yClose = getY(c.close);
                    const yHigh = getY(c.high);
                    const yLow = getY(c.low);

                    const bodyY = Math.min(yOpen, yClose);
                    const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

                    const color = isBull ? '#10b981' : '#ef4444';

                    return (
                      <g key={i} className="transition-opacity">
                        {/* High-Low Wick */}
                        <line
                          x1={cx}
                          y1={yHigh}
                          x2={cx}
                          y2={yLow}
                          stroke={color}
                          strokeWidth="1.2"
                        />
                        {/* Open-Close Body */}
                        <rect
                          x={x}
                          y={bodyY}
                          width={candleBodyWidth}
                          height={bodyHeight}
                          fill={color}
                          stroke={color}
                          strokeWidth="0.8"
                        />
                      </g>
                    );
                  })
                ) : (
                  /* Area Chart Mode */
                  <>
                    <path
                      d={`
                        M ${padding.left + candleSlotWidth / 2} ${getY(candles[0].close)}
                        ${candles.map((c, i) => `L ${padding.left + i * candleSlotWidth + candleSlotWidth / 2} ${getY(c.close)}`).join(' ')}
                        L ${padding.left + (candles.length - 1) * candleSlotWidth + candleSlotWidth / 2} ${padding.top + plotHeight}
                        L ${padding.left + candleSlotWidth / 2} ${padding.top + plotHeight}
                        Z
                      `}
                      fill="url(#forexAreaGradient)"
                    />
                    <path
                      d={`
                        M ${padding.left + candleSlotWidth / 2} ${getY(candles[0].close)}
                        ${candles.map((c, i) => `L ${padding.left + i * candleSlotWidth + candleSlotWidth / 2} ${getY(c.close)}`).join(' ')}
                      `}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.8"
                    />
                  </>
                )}

                {/* Active Open Positions Overlay Lines on Chart */}
                {positions.filter((p) => p.symbol === currentInstrument.symbol).map((pos) => {
                  const posY = getY(pos.entryPrice);
                  const isBuy = pos.type === 'BUY';
                  return (
                    <g key={pos.id}>
                      <line
                        x1={padding.left}
                        y1={posY}
                        x2={padding.left + plotWidth}
                        y2={posY}
                        stroke={isBuy ? '#3b82f6' : '#f97316'}
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />
                      <rect
                        x={padding.left + 5}
                        y={posY - 10}
                        width={110}
                        height={18}
                        fill={isBuy ? '#1e3a8a' : '#7c2d12'}
                        rx="2"
                      />
                      <text
                        x={padding.left + 10}
                        y={posY + 3}
                        fill="#ffffff"
                        fontSize="9"
                        fontFamily="Geist Mono, monospace"
                        fontWeight="bold"
                      >
                        {pos.type} {pos.lots}L @ {pos.entryPrice.toFixed(currentInstrument.decimals)}
                      </text>
                    </g>
                  );
                })}

                {/* Indicator: SMA line */}
                {showIndicators && smaPath && (
                  <path
                    d={smaPath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.4"
                    strokeDasharray="4 2"
                  />
                )}

                {/* Current Price Horizontal Ray */}
                {(() => {
                  const curY = getY(currentPrice);
                  return (
                    <g>
                      <line
                        x1={padding.left}
                        y1={curY}
                        x2={padding.left + plotWidth}
                        y2={curY}
                        stroke={isPositive ? '#10b981' : '#ef4444'}
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                      />
                      <rect
                        x={padding.left + plotWidth + 2}
                        y={curY - 9}
                        width={76}
                        height={18}
                        fill={isPositive ? '#10b981' : '#ef4444'}
                      />
                      <text
                        x={padding.left + plotWidth + 6}
                        y={curY + 3.5}
                        fill="#000000"
                        fontSize="9"
                        fontFamily="Geist Mono, monospace"
                        fontWeight="bold"
                      >
                        {currentPrice.toFixed(currentInstrument.decimals)}
                      </text>
                    </g>
                  );
                })()}

                {/* Crosshair Cursor */}
                {hoverIndex !== null && (
                  (() => {
                    const targetCandle = candles[hoverIndex];
                    const hx = padding.left + hoverIndex * candleSlotWidth + candleSlotWidth / 2;
                    const hy = getY(targetCandle.close);
                    return (
                      <g pointerEvents="none">
                        <line
                          x1={hx}
                          y1={padding.top}
                          x2={hx}
                          y2={padding.top + plotHeight}
                          stroke="rgba(255,255,255,0.4)"
                          strokeDasharray="2 2"
                        />
                        <line
                          x1={padding.left}
                          y1={hy}
                          x2={padding.left + plotWidth}
                          y2={hy}
                          stroke="rgba(255,255,255,0.4)"
                          strokeDasharray="2 2"
                        />
                        <circle cx={hx} cy={hy} r="3.5" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                        <rect x={hx - 36} y={padding.top + plotHeight + 3} width={72} height={16} fill="#ffffff" />
                        <text
                          x={hx}
                          y={padding.top + plotHeight + 14}
                          fill="#000000"
                          fontSize="8.5"
                          textAnchor="middle"
                          fontFamily="Geist Mono, monospace"
                          fontWeight="bold"
                        >
                          {targetCandle.dateStr} {targetCandle.timeStr}
                        </text>
                      </g>
                    );
                  })()
                )}

                {/* X-Axis periodic timestamps */}
                {candles.filter((_, idx) => idx % 6 === 0).map((c, i) => {
                  const origIndex = candles.indexOf(c);
                  const x = padding.left + origIndex * candleSlotWidth + candleSlotWidth / 2;
                  return (
                    <text
                      key={i}
                      x={x}
                      y={padding.top + plotHeight + 18}
                      fill="rgba(255,255,255,0.35)"
                      fontSize="9"
                      textAnchor="middle"
                      fontFamily="Geist Mono, monospace"
                    >
                      {c.timeStr}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Bottom telemetry footer */}
            <div className="flex flex-wrap items-center justify-between pt-3 font-mono-geist text-[10px] text-white/40 border-t border-white/10 mt-3">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>DEMO TRADING FEED // ACCURATE MARKET ENGINE</span>
              </span>
              <div className="flex items-center gap-4">
                <span>CONTRACT SIZE: <strong>{currentInstrument.contractSize} UNITS/LOT</strong></span>
                <span>SPREAD: <strong>{currentInstrument.spreadPips} PIPS</strong></span>
              </div>
            </div>
          </div>

          {/* Right 3-Cols: Live Quotes & Order Execution Panel */}
          <div className="xl:col-span-3 flex flex-col justify-between bg-[#0a0a0a] border border-white/15 p-5 space-y-5 font-mono-geist">
            
            {/* Top Panel: Bid / Ask Spread Display */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-silkscreen text-xs text-white">ORDER EXECUTION</span>
                <span className="text-[10px] text-amber-400 border border-amber-500/30 px-1.5 py-0.5 bg-amber-500/10 font-bold">
                  DEMO MONEY
                </span>
              </div>

              {/* Bid / Ask Dual Cards */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-black border border-white/10 p-2.5">
                  <div className="text-[10px] text-white/50 uppercase">SELL / BID</div>
                  <div className="font-silkscreen text-sm text-rose-400 mt-1">
                    {bidPrice.toFixed(currentInstrument.decimals)}
                  </div>
                </div>
                <div className="bg-black border border-white/10 p-2.5">
                  <div className="text-[10px] text-white/50 uppercase">BUY / ASK</div>
                  <div className="font-silkscreen text-sm text-emerald-400 mt-1">
                    {askPrice.toFixed(currentInstrument.decimals)}
                  </div>
                </div>
              </div>
            </div>

            {/* Lot Size Selector */}
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex justify-between items-center text-[10px]">
                <label className="uppercase text-white/50">LOT SIZE (VOLUME)</label>
                <span className="text-white font-bold">{orderLots} LOTS</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[0.1, 0.5, 1.0, 5.0].map((lots) => (
                  <button
                    key={lots}
                    onClick={() => setOrderLots(lots)}
                    className={`py-1 text-[10px] font-silkscreen border cursor-pointer ${
                      orderLots === lots
                        ? 'border-white bg-white text-black font-bold'
                        : 'border-white/15 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {lots}L
                  </button>
                ))}
              </div>
            </div>

            {/* Optional TP / SL Inputs */}
            <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[10px]">
              <div>
                <label className="text-white/50 block mb-1">TAKE PROFIT (TP)</label>
                <input
                  type="number"
                  placeholder="e.g. 2780.00"
                  value={orderTP}
                  onChange={(e) => setOrderTP(e.target.value)}
                  className="w-full bg-black border border-white/15 p-1.5 text-xs text-emerald-400 font-mono-geist focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-white/50 block mb-1">STOP LOSS (SL)</label>
                <input
                  type="number"
                  placeholder="e.g. 2720.00"
                  value={orderSL}
                  onChange={(e) => setOrderSL(e.target.value)}
                  className="w-full bg-black border border-white/15 p-1.5 text-xs text-rose-400 font-mono-geist focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Instant Market BUY / SELL Execution */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExecuteOrder('SELL')}
                  className="py-3 px-2 bg-rose-600 hover:bg-rose-500 text-white font-silkscreen text-xs font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>SELL MARKET</span>
                </button>
                <button
                  onClick={() => handleExecuteOrder('BUY')}
                  className="py-3 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-silkscreen text-xs font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>BUY MARKET</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/50">24H HIGH:</span>
                <span className="text-white font-medium">{maxPrice.toFixed(currentInstrument.decimals)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-white/50">24H LOW:</span>
                <span className="text-white font-medium">{minPrice.toFixed(currentInstrument.decimals)}</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: ACTIVE POSITIONS MONITOR */}
      {activeTab === 'positions' && (
        <div className="bg-[#080808] border border-white/15 p-5 space-y-4 font-mono-geist">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="font-silkscreen text-sm text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>OPEN DEMO POSITIONS ({positions.length})</span>
            </span>
            <div className="text-xs text-white/60">
              TOTAL FLOATING PnL:{' '}
              <strong className={`font-silkscreen ${totalFloatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalFloatingPnl >= 0 ? '+' : ''}${totalFloatingPnl.toFixed(2)}
              </strong>
            </div>
          </div>

          {positions.length === 0 ? (
            <div className="text-center py-10 border border-white/5 bg-black/40 text-white/40 text-xs">
              NO OPEN POSITIONS. GO TO TERMINAL TAB AND PLACE A BUY OR SELL ORDER ON GOLD OR BITCOIN.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white border-collapse">
                <thead>
                  <tr className="border-b border-white/15 font-silkscreen text-[10px] text-white/40 uppercase">
                    <th className="py-2.5 px-3">SYMBOL</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3">VOLUME</th>
                    <th className="py-2.5 px-3">ENTRY PRICE</th>
                    <th className="py-2.5 px-3">CURRENT PRICE</th>
                    <th className="py-2.5 px-3">TP / SL</th>
                    <th className="py-2.5 px-3">UNREALIZED PnL</th>
                    <th className="py-2.5 px-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {positions.map((pos) => {
                    const isBuy = pos.type === 'BUY';
                    const isProfit = pos.pnl >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-silkscreen text-white font-bold">{pos.symbol}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 font-silkscreen text-[10px] font-bold ${
                              isBuy ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            }`}
                          >
                            {pos.type}
                          </span>
                        </td>
                        <td className="py-3 px-3">{pos.lots} LOTS</td>
                        <td className="py-3 px-3">${pos.entryPrice.toFixed(pos.decimals)}</td>
                        <td className="py-3 px-3 font-semibold">${pos.currentPrice.toFixed(pos.decimals)}</td>
                        <td className="py-3 px-3 text-white/50 text-[11px]">
                          TP: {pos.tp ? `$${pos.tp}` : 'NONE'} | SL: {pos.sl ? `$${pos.sl}` : 'NONE'}
                        </td>
                        <td className={`py-3 px-3 font-silkscreen font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${pos.pnl.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleClosePosition(pos)}
                            className="px-3 py-1 bg-white text-black font-silkscreen text-[10px] font-bold hover:bg-neutral-200 cursor-pointer"
                          >
                            CLOSE
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </section>
  );
};

export default ForexChart;
