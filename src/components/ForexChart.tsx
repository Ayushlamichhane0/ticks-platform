import React, { lazy, Suspense, useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
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
  RotateCcw,
  Clock,
  Layers,
  Sparkles,
  Info,
  Loader2
} from 'lucide-react';
import { getViewAsHeaders, useMarketStore } from '../store/useMarketStore';
import { useTradingStore } from '../store/useTradingStore';
import { buildPositions } from '../store/positions';
import { MARKET_INSTRUMENTS } from '../constants/market';
import type { MarketInstrument } from '../constants/market';

const TradingPriceChart = lazy(() =>
  import('./TradingPriceChart').then((module) => ({ default: module.TradingPriceChart }))
);

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

export const TIMEFRAMES = ['1M', '5M', '15M', '1H', '4H', '1D'] as const;
export type Timeframe = typeof TIMEFRAMES[number];

const BINANCE_INTERVALS: Record<Timeframe, string> = {
  '1M': '1m',
  '5M': '5m',
  '15M': '15m',
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
};

const TWELVE_DATA_INTERVALS: Record<Timeframe, string> = {
  '1M': '1min',
  '5M': '5min',
  '15M': '15min',
  '1H': '1h',
  '4H': '4h',
  '1D': '1day',
};

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

async function submitTradeClose(getAccessToken: () => Promise<string>, tradeId: string, exitPrice: number) {
  const response = await fetch('/.netlify/functions/trade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getAccessToken()}`,
      ...getViewAsHeaders(),
    },
    body: JSON.stringify({
      action: 'close',
      tradeId: Number(tradeId),
      exitPrice,
    }),
  });
  const result = await response.json() as {
    success?: boolean;
    message?: string;
    demoBalance?: number;
    realizedPnl?: number;
  };

  if (
    response.status !== 200 ||
    !result.success ||
    typeof result.demoBalance !== 'number' ||
    typeof result.realizedPnl !== 'number'
  ) {
    throw new Error(result.message || `Trade close failed (${response.status})`);
  }

  return { demoBalance: result.demoBalance, realizedPnl: result.realizedPnl };
}

async function submitAccountAction(
  getAccessToken: () => Promise<string>,
  action: 'balance' | 'reset'
) {
  const response = await fetch('/.netlify/functions/trade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getAccessToken()}`,
      ...getViewAsHeaders(),
    },
    body: JSON.stringify({ action }),
  });
  const result = await response.json() as {
    success?: boolean;
    message?: string;
    demoBalance?: number;
  };

  if (response.status !== 200 || !result.success || typeof result.demoBalance !== 'number') {
    throw new Error(result.message || `Account request failed (${response.status})`);
  }

  return result.demoBalance;
}

function createCandleTime(timestamp: number, timeframe: Timeframe) {
  const dateObj = new Date(timestamp);
  const dateStr = [
    dateObj.getFullYear(),
    String(dateObj.getMonth() + 1).padStart(2, '0'),
    String(dateObj.getDate()).padStart(2, '0'),
  ].join('-');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');

  return {
    dateStr,
    timeStr: timeframe === '1D' ? `${month}/${day}` : `${hours}:${minutes}`,
  };
}

function updateLatestCandlePrice(existingCandles: Candle[], price: number): Candle[] {
  const latest = existingCandles[existingCandles.length - 1];
  if (!latest || !Number.isFinite(price) || price <= 0) return existingCandles;
  return [
    ...existingCandles.slice(0, -1),
    {
      ...latest,
      high: Math.max(latest.high, price),
      low: Math.min(latest.low, price),
      close: price,
    },
  ];
}

function parseBinanceKlines(payload: unknown, timeframe: Timeframe): Candle[] {
  if (!Array.isArray(payload)) {
    throw new Error('Binance historical response was not a candle list.');
  }

  return payload.map((row): Candle => {
    if (!Array.isArray(row) || row.length < 6) {
      throw new Error('Binance returned an invalid historical candle.');
    }

    const timestamp = Number(row[0]);
    const open = Number(row[1]);
    const high = Number(row[2]);
    const low = Number(row[3]);
    const close = Number(row[4]);
    const volume = Number(row[5]);
    if (!Number.isFinite(timestamp) || ![open, high, low, close, volume].every(Number.isFinite)) {
      throw new Error('Binance returned non-numeric historical candle data.');
    }

    const { dateStr, timeStr } = createCandleTime(timestamp, timeframe);
    return { timeStr, dateStr, timestamp, open, high, low, close, volume };
  }).sort((a, b) => a.timestamp - b.timestamp);
}

function parseGoldHistory(payload: unknown, timeframe: Timeframe): Candle[] {
  if (payload === null || typeof payload !== 'object' || !('candles' in payload) || !Array.isArray(payload.candles)) {
    throw new Error('Historical gold response did not contain candles.');
  }

  const parsedCandles = payload.candles.slice().reverse().map((item): Candle => {
    if (item === null || typeof item !== 'object' || !('time' in item)) {
      throw new Error('Twelve Data returned an invalid historical gold candle.');
    }

    const candle = item as Record<string, unknown>;
    const timestampSeconds = Number(candle.time);
    const timestamp = timestampSeconds * 1000;
    const open = parseFloat(String(candle.open));
    const high = parseFloat(String(candle.high));
    const low = parseFloat(String(candle.low));
    const close = parseFloat(String(candle.close));
    const volume = Number(candle.volume ?? 0);
    if (
      !Number.isSafeInteger(timestampSeconds) ||
      timestampSeconds <= 0 ||
      ![open, high, low, close, volume].every(Number.isFinite)
    ) {
      throw new Error('Twelve Data returned non-numeric historical gold candle data.');
    }

    const { dateStr, timeStr } = createCandleTime(timestamp, timeframe);
    return { timeStr, dateStr, timestamp, open, high, low, close, volume };
  }).sort((a, b) => a.timestamp - b.timestamp);
  if (parsedCandles.length === 0) {
    throw new Error('Twelve Data returned no historical XAU/USD candles.');
  }
  return parsedCandles;
}

export const ForexChart: React.FC<{ getAccessToken: () => Promise<string> }> = ({ getAccessToken }) => {
  const selectedSymbol = useMarketStore((store) => store.selectedSymbol);
  const timeframe = useMarketStore((store) => store.timeframe);
  const setStoreTimeframe = useMarketStore((store) => store.setTimeframe);
  const livePrice = useMarketStore((store) => store.livePrice);
  const demoBalance = useMarketStore((store) => store.demoBalance);
  const setDemoBalance = useMarketStore((store) => store.setDemoBalance);
  const addOpenPosition = useMarketStore((store) => store.addOpenPosition);
  const triggerTradeRefresh = useMarketStore((store) => store.triggerTradeRefresh);
  const viewAsUserId = useMarketStore((store) => store.viewAsUserId);
  const refreshOpenPositions = useMarketStore((store) => store.refreshOpenPositions);
  const tradeHistory = useMarketStore((store) => store.tradeHistory);
  const fetchTradeHistory = useMarketStore((store) => store.fetchTradeHistory);
  const sessionOpenPrice = useMarketStore((store) => store.sessionOpenPrice);
  const connectionStatus = useMarketStore((store) => store.status);
  const setSelectedSymbol = useMarketStore((store) => store.setSelectedSymbol);
  const fetchGoldHistory = useMarketStore((store) => store.fetchGoldHistory);
  // Instrument selection
  const currentInstrument = useMemo(() => {
    return MARKET_INSTRUMENTS.find((instrument) => instrument.feedSymbol === selectedSymbol)
      ?? MARKET_INSTRUMENTS.find((instrument) => instrument.feedSymbol === 'BTCUSDT')!;
  }, [selectedSymbol]);

  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  const trades = useTradingStore((store) => store.trades);
  const storePrices = useTradingStore((store) => store.prices);

  const openPositions = useMemo(() => buildPositions(trades), [trades]);

  const unrealizedPnl = useMemo(() => {
    return openPositions.reduce((total, pos) => {
      const price = storePrices[pos.symbol] ?? pos.avgPrice;
      const posPnl =
        pos.side === 'LONG'
          ? (price - pos.avgPrice) * pos.size
          : (pos.avgPrice - price) * pos.size;
      return total + posPnl;
    }, 0);
  }, [openPositions, storePrices]);

  const totalEquity = (demoBalance ?? 0) + unrealizedPnl;

  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [history, setHistory] = useState<TradeHistoryItem[]>([]);
  const [orderLots, setOrderLots] = useState<number>(1.0);
  const [orderTP, setOrderTP] = useState<string>('');
  const [orderSL, setOrderSL] = useState<string>('');
  const [executingSide, setExecutingSide] = useState<'BUY' | 'SELL' | null>(null);
  const [isTradeHistoryOpen, setIsTradeHistoryOpen] = useState(false);
  const [isTradeHistoryLoading, setIsTradeHistoryLoading] = useState(false);
  const [tradeHistoryError, setTradeHistoryError] = useState<string | null>(null);
  const pendingCloseIds = useRef(new Set<string>());
  const executingOrderRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'positions' | 'history'>('terminal');

  const openTradeHistory = async () => {
    setIsTradeHistoryOpen(true);
    setIsTradeHistoryLoading(true);
    setTradeHistoryError(null);
    try {
      await fetchTradeHistory(await getAccessToken());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Trade history is unavailable.';
      setTradeHistoryError(message);
      toast.error(message);
    } finally {
      setIsTradeHistoryLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void submitAccountAction(getAccessToken, 'balance')
      .then((balance) => {
        if (active) setDemoBalance(balance);
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : 'Unable to load demo balance.');
      });

    return () => {
      active = false;
    };
  }, [getAccessToken, viewAsUserId]);

  useEffect(() => {
    if (!viewAsUserId) return;
    let active = true;

    void getAccessToken()
      .then((accessToken) => refreshOpenPositions(accessToken))
      .then((accountPositions) => {
        if (!active) return;
        setPositions(accountPositions.map((position) => {
          const instrument = MARKET_INSTRUMENTS.find(
            (marketInstrument) => marketInstrument.feedSymbol === position.symbol
          );
          return {
            id: position.id,
            symbol: instrument?.symbol ?? position.symbol,
            type: position.side === 'buy' ? 'BUY' : 'SELL',
            lots: position.amount,
            entryPrice: position.price,
            currentPrice: position.price,
            tp: null,
            sl: null,
            pnl: 0,
            contractSize: position.contractSize,
            decimals: instrument?.decimals ?? currentInstrument.decimals,
            openTimestamp: new Date(position.createdAt).toLocaleTimeString(),
          };
        }));
      })
      .catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : 'Unable to load viewed account positions.');
      });

    return () => {
      active = false;
    };
  }, [currentInstrument.decimals, getAccessToken, refreshOpenPositions, viewAsUserId]);

  // Candle series
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    setCandles([]);

    const controller = new AbortController();
    let active = true;
    const loadHistoricalCandles = async () => {
      try {
        const isSpotGold = selectedSymbol === 'XAUUSD';
        let payload: unknown;
        if (isSpotGold) {
          payload = await fetchGoldHistory(TWELVE_DATA_INTERVALS[timeframe], controller.signal);
        } else {
          const query = new URLSearchParams({
            symbol: selectedSymbol,
            interval: BINANCE_INTERVALS[timeframe],
            limit: '100',
          });
          const response = await fetch(
            `https://api.binance.com/api/v3/klines?${query.toString()}`,
            { signal: controller.signal }
          );
          if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Historical ${selectedSymbol} candle request failed.`, {
              status: response.status,
              response: errorBody,
            });
            throw new Error(`Historical ${selectedSymbol} candle request failed with HTTP ${response.status}.`);
          }
          payload = await response.json();
        }
        const historicalCandles = isSpotGold
          ? parseGoldHistory(payload, timeframe)
          : parseBinanceKlines(payload, timeframe);
        if (!active) return;

        const latestLivePrice = useMarketStore.getState().livePrice;
        const withCurrentPrice = latestLivePrice === null
          ? historicalCandles
          : updateLatestCandlePrice(historicalCandles, latestLivePrice);
        setCandles(withCurrentPrice.slice(-100));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(`Unable to load ${selectedSymbol} historical candles.`, error);
      }
    };

    void loadHistoricalCandles();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedSymbol, timeframe, fetchGoldHistory]);

  // Handle instrument change.
  const handleInstrumentSelect = (inst: MarketInstrument) => {
    if (inst.feedSymbol) setSelectedSymbol(inst.feedSymbol);
  };

  useEffect(() => {
    if (!isLiveStreaming) return;
    const price = livePrice;
    if (price === null) return;

    setCandles((previousCandles) => updateLatestCandlePrice(previousCandles, price));

    setPositions((previousPositions) =>
      previousPositions.map((position) => {
        if (position.symbol !== currentInstrument.symbol) return position;

        const priceDelta = position.type === 'BUY'
          ? price - position.entryPrice
          : position.entryPrice - price;
        const livePnl = +(priceDelta * position.contractSize * position.lots).toFixed(2);

        if (
          position.tp &&
          ((position.type === 'BUY' && price >= position.tp) ||
            (position.type === 'SELL' && price <= position.tp))
        ) {
          triggerAutoClose(position, price, 'TAKE_PROFIT', livePnl);
        } else if (
          position.sl &&
          ((position.type === 'BUY' && price <= position.sl) ||
            (position.type === 'SELL' && price >= position.sl))
        ) {
          triggerAutoClose(position, price, 'STOP_LOSS', livePnl);
        }

        return { ...position, currentPrice: price, pnl: livePnl };
      })
    );
  }, [
    isLiveStreaming,
    currentInstrument.symbol,
    livePrice,
    selectedSymbol,
    timeframe,
  ]);

  // Current Market metrics
  const currentFeedStatus = connectionStatus;
  const priceChange = livePrice !== null && sessionOpenPrice !== null
    ? +(livePrice - sessionOpenPrice).toFixed(currentInstrument.decimals)
    : null;
  const priceChangePct = priceChange !== null && sessionOpenPrice
    ? +((priceChange / sessionOpenPrice) * 100).toFixed(2)
    : null;
  const isPositive = (priceChange ?? 0) >= 0;

  const bidPrice = livePrice;
  const askPrice = livePrice;

  // Compute total unrealized floating PnL
  const totalFloatingPnl = useMemo(() => {
    return +(positions.reduce((acc, pos) => acc + pos.pnl, 0)).toFixed(2);
  }, [positions]);

  const equity = +((demoBalance ?? 0) + totalFloatingPnl).toFixed(2);
  const sessionCandleHigh = candles.length > 0
    ? candles.reduce((high, candle) => Math.max(high, candle.high), -Infinity)
    : null;
  const sessionCandleLow = candles.length > 0
    ? candles.reduce((low, candle) => Math.min(low, candle.low), Infinity)
    : null;

  // Auto trigger closing position for TP/SL
  const triggerAutoClose = (pos: OpenPosition, exitPrice: number, reason: 'TAKE_PROFIT' | 'STOP_LOSS', finalPnl: number) => {
    if (viewAsUserId) return;
    if (pendingCloseIds.current.has(pos.id)) return;
    pendingCloseIds.current.add(pos.id);

    void submitTradeClose(getAccessToken, pos.id, exitPrice).then(({ demoBalance: balance, realizedPnl }) => {
      setPositions((prev) => prev.filter((position) => position.id !== pos.id));
      setDemoBalance(balance);
      triggerTradeRefresh();
      const nowStr = new Date().toLocaleTimeString();
      setHistory((prev) => [
        {
          id: pos.id,
          symbol: pos.symbol,
          type: pos.type,
          lots: pos.lots,
          entryPrice: pos.entryPrice,
          exitPrice,
          pnl: realizedPnl,
          openTimestamp: pos.openTimestamp,
          closeTimestamp: nowStr,
          reason,
        },
        ...prev,
      ]);
      toast.success(`Auto-closed ${pos.symbol} [${reason}] // P&L: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl}`);
    }).catch((error: unknown) => {
      pendingCloseIds.current.delete(pos.id);
      toast.error(error instanceof Error ? error.message : 'Trade close failed; position remains open.');
    });
  };

  // Submit a mock backend trade, then reflect the successful order in the demo account.
  const handleExecuteOrder = async (side: 'BUY' | 'SELL') => {
    if (viewAsUserId) return;
    const execPrice = side === 'BUY' ? askPrice : bidPrice;
    if (execPrice === null || executingOrderRef.current) return;
    const amount = Number(orderLots);
    if (!Number.isFinite(amount) || amount <= 0) {
      console.error('Trade amount must be a positive finite number.', { amount: orderLots });
      return;
    }

    const requestBody = {
      action: 'open',
      symbol: selectedSymbol,
      amount,
      price: execPrice,
      side: side.toLowerCase(),
    };
    console.log('SENDING TRADE:', {
      symbol: requestBody.symbol,
      side: requestBody.side,
      amount: requestBody.amount,
      price: requestBody.price,
    });
    executingOrderRef.current = true;
    setExecutingSide(side);

    try {
      let response: Response;
      try {
        response = await fetch('/.netlify/functions/trade', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAccessToken()}`,
        ...getViewAsHeaders(),
        },
          body: JSON.stringify(requestBody),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Trade failed due to a network error.');
        return;
      }
      const result = await response.json() as {
        success?: boolean;
        message?: string;
        error?: string;
        tradeId?: string;
        newBalance?: number;
      };

      if (!result || typeof result !== 'object') {
        console.error('Trade endpoint returned an invalid JSON response.', {
          status: response.status,
          result,
        });
        return;
      }

      if (result?.success === false) {
        if (result.error) {
          console.error('Trade endpoint returned an error.', {
            status: response.status,
            error: result.error,
          });
        }
        toast.error(result.message || result.error || `Trade request failed (${response.status})`);
        return;
      }

      if (
        response.status !== 200 ||
        result.success !== true ||
        typeof result.tradeId !== 'string' ||
        typeof result.newBalance !== 'number' ||
        !Number.isFinite(result.newBalance)
      ) {
        console.error('Trade endpoint returned an unexpected response.', {
          status: response.status,
          result,
        });
        return;
      }

      if (typeof result.newBalance === 'number') {
        setDemoBalance(result.newBalance);
      }
      triggerTradeRefresh();
      toast.success(`${side} order executed successfully.`);
      const tpVal = orderTP ? parseFloat(orderTP) : null;
      const slVal = orderSL ? parseFloat(orderSL) : null;
      const createdAt = new Date().toISOString();

      const newPos: OpenPosition = {
        id: result.tradeId,
        symbol: currentInstrument.symbol,
        type: side,
        lots: amount,
        entryPrice: execPrice,
        currentPrice: execPrice,
        tp: tpVal,
        sl: slVal,
        pnl: 0.00,
        contractSize: currentInstrument.contractSize,
        decimals: currentInstrument.decimals,
        openTimestamp: new Date(createdAt).toLocaleTimeString(),
      };

      setPositions((prev) => [newPos, ...prev]);
      setDemoBalance(result.newBalance);
      addOpenPosition({
        id: result.tradeId,
        symbol: selectedSymbol,
        amount,
        price: execPrice,
        side: side === 'BUY' ? 'buy' : 'sell',
        contractSize: currentInstrument.contractSize,
        createdAt,
      });
    } catch (error) {
      console.error('Unable to process trade response or update trade state.', error);
    } finally {
      executingOrderRef.current = false;
      setExecutingSide(null);
    }
  };

  // Close open position manually
  const handleClosePosition = async (pos: OpenPosition) => {
    if (viewAsUserId) return;
    if (pendingCloseIds.current.has(pos.id)) return;
    pendingCloseIds.current.add(pos.id);
    try {
      const { demoBalance, realizedPnl } = await submitTradeClose(getAccessToken, pos.id, pos.currentPrice);
      setPositions((prev) => prev.filter((position) => position.id !== pos.id));
      setDemoBalance(demoBalance);
      triggerTradeRefresh();

      const nowStr = new Date().toLocaleTimeString();
      setHistory((prev) => [
        {
          id: pos.id,
          symbol: pos.symbol,
          type: pos.type,
          lots: pos.lots,
          entryPrice: pos.entryPrice,
          exitPrice: pos.currentPrice,
          pnl: realizedPnl,
          openTimestamp: pos.openTimestamp,
          closeTimestamp: nowStr,
          reason: 'MANUAL',
        },
        ...prev,
      ]);

      toast.success(`Closed ${pos.symbol} // realized P&L: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Trade close failed; position remains open.');
    } finally {
      pendingCloseIds.current.delete(pos.id);
    }
  };

  // Reset Demo Balance
  const handleResetDemoAccount = async () => {
    if (viewAsUserId) return;
    try {
      const balance = await submitAccountAction(getAccessToken, 'reset');
      setDemoBalance(balance);
      setPositions([]);
      setHistory([]);
      toast.success('Demo account reset to $100,000.00.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to reset demo account.');
    }
  };


  return (
    <section id="forex" className="w-full min-w-0 overflow-hidden py-10 sm:py-14 border-b border-white/10">
      
      {/* Top Header & Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-white/10 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          <span className="font-silkscreen text-sm sm:text-base text-white tracking-wider">
            01. LIVE TRADING TERMINAL // DEMO MONEY
          </span>
          <span className={`font-mono-geist text-[10px] border px-2 py-0.5 font-bold ${
            currentFeedStatus === 'connected'
              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
              : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
          }`}>
            {currentFeedStatus === 'connected'
              ? `LIVE: ${selectedSymbol === 'XAUUSD' ? 'GOLD API' : 'REST POLLING'}`
              : `${selectedSymbol === 'XAUUSD' ? 'GOLD API' : 'REST POLLING'} ${currentFeedStatus.toUpperCase()}`}
            {' // '}
            {currentInstrument.feedSymbol ?? 'NO LIVE FEED'}
          </span>
        </div>

        {/* Timeframe selector & stream state */}
        <div className="flex items-center gap-2 flex-wrap font-mono-geist text-xs">
          <div className="flex items-center bg-[#0e0e0e] border border-white/15 p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setStoreTimeframe(tf)}
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
            <span className="font-silkscreen text-[10px]">{isLiveStreaming ? 'CHART LIVE' : 'CHART PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* DEMO ACCOUNT STATS DASHBOARD BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono-geist">
        <div className="bg-[#0a0a0a] border border-white/15 p-3.5 relative overflow-hidden">
          <div className="text-[10px] text-white/50 uppercase font-silkscreen flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>CASH BALANCE</span>
          </div>
          <div className="font-silkscreen text-xl sm:text-2xl text-white mt-1">
            ${demoBalance === null
              ? '—'
              : demoBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9.5px] text-emerald-400 mt-1">100% VIRTUAL DEMO CASH</div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/15 p-3.5">
          <div className="text-[10px] text-white/50 uppercase font-silkscreen">TOTAL EQUITY</div>
          <div className="font-silkscreen text-xl sm:text-2xl text-white mt-1">
            ${totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9.5px] text-white/40 mt-1">CASH + ASSET VALUE</div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/15 p-3.5">
          <div className="text-[10px] text-white/50 uppercase font-silkscreen">UNREALIZED PNL</div>
          <div className={`font-silkscreen text-xl sm:text-2xl mt-1 ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
          </div>
          <div className="text-[9.5px] text-white/40 mt-1">{openPositions.length} ACTIVE POSITIONS</div>
        </div>

        <div className="bg-[#0a0a0a] border border-white/15 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/50 uppercase font-silkscreen">ACCOUNT MANAGEMENT</span>
            {viewAsUserId ? (
              <span className="font-mono-geist text-[10px] text-rose-300">READ ONLY</span>
            ) : (
              <button
                onClick={handleResetDemoAccount}
                className="p-1 text-white/50 hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-silkscreen"
                title="Reset Demo Account to $100,000"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET $100K</span>
              </button>
            )}
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
              onClick={() => void openTradeHistory()}
              className={`flex-1 py-1 text-[10px] font-silkscreen border cursor-pointer relative ${
                isTradeHistoryOpen ? 'bg-white text-black border-white' : 'border-white/15 text-white/60'
              }`}
            >
              TRADES ({tradeHistory.length})
            </button>
          </div>
        </div>
      </div>

      {/* Instrument Selection Tabs Ribbon (Gold, BTC, ETH, Forex, etc.) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none font-mono-geist text-xs">
        {MARKET_INSTRUMENTS.map((inst) => {
          const isSelected = currentInstrument.symbol === inst.symbol;
          const liveInstrumentPrice = inst.feedSymbol === selectedSymbol ? livePrice : null;
          return (
            <button
              key={inst.symbol}
              onClick={() => handleInstrumentSelect(inst)}
              disabled={!inst.feedSymbol}
              title={inst.feedSymbol ? `Stream ${inst.feedSymbol}` : 'No live feed configured'}
              className={`flex items-center gap-2 px-3.5 py-2 border transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-white text-black border-white font-bold shadow-md'
                  : inst.feedSymbol
                    ? 'bg-[#0a0a0a] border-white/15 text-white/70 hover:border-white/40 hover:text-white cursor-pointer'
                    : 'bg-[#0a0a0a] border-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <span className="text-sm">{inst.icon}</span>
              <span className="font-silkscreen text-[11px] tracking-wider">{inst.symbol}</span>
              {inst.feedSymbol && (
                <span className="font-mono-geist text-[10px]">
                  {liveInstrumentPrice === null
                    ? '--'
                    : `$${liveInstrumentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              )}
              <span className={`text-[9.5px] px-1 py-0.2 ${isSelected ? 'bg-black text-white' : 'bg-white/10 text-white/60'}`}>
                {inst.category}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE TERMINAL VIEW */}
      {activeTab === 'terminal' && (
        <div className="flex min-w-0 flex-col items-stretch gap-4 sm:gap-6 lg:flex-row">
          
          {/* Left 9-Cols: Interactive Live Chart Canvas & Telemetry HUD */}
          <div className="min-w-0 w-full flex-1 bg-[#080808] border border-white/15 p-3 sm:p-5 flex flex-col justify-between">
            
            {/* Top Chart Stats Ribbon */}
            <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 gap-4 font-mono-geist">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currentInstrument.icon}</span>
                  <span className="font-silkscreen text-xs text-white/70">{currentInstrument.name}</span>
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-silkscreen text-2xl sm:text-3xl text-white font-bold tracking-tight">
                    {livePrice === null
                      ? currentFeedStatus === 'connecting'
                        ? 'CONNECTING...'
                        : currentFeedStatus === 'error'
                          ? 'FEED RECONNECTING...'
                          : 'LIVE PRICE UNAVAILABLE'
                      : `$${livePrice.toLocaleString('en-US', { minimumFractionDigits: currentInstrument.decimals, maximumFractionDigits: currentInstrument.decimals })}`}
                  </span>
                  {priceChange !== null && priceChangePct !== null && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 ${
                      isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{isPositive ? '+' : ''}{priceChange.toFixed(currentInstrument.decimals)}</span>
                      <span>({isPositive ? '+' : ''}{priceChangePct}% SESSION)</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            <Suspense fallback={<div className="h-[320px] w-full border border-white/10 bg-[#0a0a0a] sm:h-[380px]" />}>
              <TradingPriceChart
                key={`${selectedSymbol}-${timeframe}`}
              />
            </Suspense>

            {/* Bottom telemetry footer */}
            <div className="flex flex-wrap items-center justify-between pt-3 font-mono-geist text-[10px] text-white/40 border-t border-white/10 mt-3">
              <span className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${currentFeedStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{selectedSymbol === 'XAUUSD' ? 'GOLD API' : 'BINANCE'} {currentInstrument.feedSymbol ?? 'NO LIVE FEED'} PRICE // DEMO ORDERS</span>
              </span>
              <div className="flex items-center gap-4">
                <span>CONTRACT SIZE: <strong>{currentInstrument.contractSize} UNITS/LOT</strong></span>
                <span>EXECUTION: <strong>LAST TRADE PRICE</strong></span>
              </div>
            </div>
          </div>

          {/* Right 3-Cols: Live Quotes & Order Execution Panel */}
          <div className="min-w-0 w-full shrink-0 flex flex-col justify-between bg-[#0a0a0a] border border-white/15 p-4 sm:p-5 space-y-5 font-mono-geist lg:w-80">
            
            {/* Top Panel: Bid / Ask Spread Display */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-silkscreen text-xs text-white">ORDER EXECUTION // {selectedSymbol}</span>
                <span className="text-[10px] text-amber-400 border border-amber-500/30 px-1.5 py-0.5 bg-amber-500/10 font-bold">
                  DEMO MONEY
                </span>
              </div>

              {/* Bid / Ask Dual Cards */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-black border border-white/10 p-2.5">
                  <div className="text-[10px] text-white/50 uppercase">SELL / LAST TRADE</div>
                  <div className="font-silkscreen text-sm text-rose-400 mt-1">
                    {bidPrice?.toFixed(currentInstrument.decimals) ?? '--'}
                  </div>
                </div>
                <div className="bg-black border border-white/10 p-2.5">
                  <div className="text-[10px] text-white/50 uppercase">BUY / LAST TRADE</div>
                  <div className="font-silkscreen text-sm text-emerald-400 mt-1">
                    {askPrice?.toFixed(currentInstrument.decimals) ?? '--'}
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
                    disabled={Boolean(viewAsUserId)}
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
                  disabled={Boolean(viewAsUserId)}
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
                  disabled={Boolean(viewAsUserId)}
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
                  disabled={Boolean(viewAsUserId) || livePrice === null || executingSide !== null}
                  className="py-3 px-2 bg-rose-600 hover:bg-rose-500 disabled:bg-neutral-800 disabled:text-white/30 disabled:cursor-not-allowed text-white font-silkscreen text-xs font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {executingSide === 'SELL' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>SELL {selectedSymbol}</span>
                </button>
                <button
                  onClick={() => handleExecuteOrder('BUY')}
                  disabled={Boolean(viewAsUserId) || livePrice === null || executingSide !== null}
                  className="py-3 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-white/30 disabled:cursor-not-allowed text-white font-silkscreen text-xs font-bold tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {executingSide === 'BUY' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>BUY {selectedSymbol}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="border-t border-white/10 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/50">SESSION HIGH:</span>
                <span className="text-white font-medium">{sessionCandleHigh?.toFixed(currentInstrument.decimals) ?? '--'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-white/50">SESSION LOW:</span>
                <span className="text-white font-medium">{sessionCandleLow?.toFixed(currentInstrument.decimals) ?? '--'}</span>
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
              NO OPEN POSITIONS. GO TO THE TERMINAL TAB AND PLACE A BUY OR SELL ORDER ON A CRYPTO PAIR.
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
                            disabled={Boolean(viewAsUserId)}
                            className="px-3 py-1 bg-white text-black font-silkscreen text-[10px] font-bold hover:bg-neutral-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {viewAsUserId ? 'READ ONLY' : 'CLOSE'}
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

      {isTradeHistoryOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <section
            aria-labelledby="trade-history-title"
            aria-modal="true"
            className="w-full max-w-5xl border border-white/15 bg-[#090909] shadow-2xl"
            role="dialog"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <p className="font-mono-geist text-[10px] tracking-[0.2em] text-emerald-400">ACCOUNT // LEDGER</p>
                <h2 className="mt-1 font-silkscreen text-sm text-white" id="trade-history-title">TRADE HISTORY</h2>
              </div>
              <button
                aria-label="Close trade history"
                className="border border-white/15 px-3 py-1.5 font-mono-geist text-xs text-white/70 hover:border-white/40 hover:text-white"
                onClick={() => setIsTradeHistoryOpen(false)}
                type="button"
              >
                CLOSE
              </button>
            </header>
            <div className="max-h-[70vh] overflow-auto p-4 sm:p-5">
              {isTradeHistoryLoading ? (
                <p className="py-10 text-center font-mono-geist text-xs text-white/50">LOADING TRADE HISTORY…</p>
              ) : tradeHistoryError ? (
                <p className="border border-rose-500/20 bg-rose-500/5 p-4 font-mono-geist text-xs text-rose-300" role="alert">
                  {tradeHistoryError}
                </p>
              ) : tradeHistory.length === 0 ? (
                <p className="py-10 text-center font-mono-geist text-xs text-white/50">NO TRADES RECORDED.</p>
              ) : (
                <table className="w-full min-w-[680px] border-collapse text-left font-mono-geist text-xs text-white">
                  <thead>
                    <tr className="border-b border-white/15 font-silkscreen text-[10px] text-white/45">
                      <th className="px-3 py-3">DATE</th>
                      <th className="px-3 py-3">SYMBOL</th>
                      <th className="px-3 py-3">SIDE</th>
                      <th className="px-3 py-3 text-right">AMOUNT</th>
                      <th className="px-3 py-3 text-right">PRICE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {tradeHistory.map((trade) => (
                      <tr className="hover:bg-white/[0.03]" key={trade.id}>
                        <td className="px-3 py-3 text-white/60">{new Date(trade.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-3 font-semibold">{trade.symbol}</td>
                        <td className={`px-3 py-3 font-bold ${trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.side.toUpperCase()}
                        </td>
                        <td className="px-3 py-3 text-right">{trade.amount.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right">${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}

    </section>
  );
};

export default ForexChart;
