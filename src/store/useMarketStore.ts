import { create } from 'zustand';
import { useTradingStore } from './useTradingStore';

export type MarketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type MarketTimeframe = '1M' | '5M' | '15M' | '1H' | '4H' | '1D';

export interface MarketChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface OpenMarketPosition {
  id: string;
  symbol: string;
  amount: number;
  price: number;
  side: 'buy' | 'sell';
  contractSize: number;
  createdAt: string;
}

export interface TradeHistoryRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  createdAt: string;
  closedAt: string | null;
}

export interface CurrentUserProfile {
  id: string;
  email: string | null;
  demo_balance: number;
  is_admin: boolean;
  created_at: string | null;
}

interface MarketStore {
  selectedSymbol: string;
  timeframe: MarketTimeframe;
  livePrice: number | null;
  demoBalance: number | null;
  currentUser: CurrentUserProfile | null;
  viewAsUserId: string | null;
  viewAsUserEmail: string | null;
  openPositions: OpenMarketPosition[];
  tradeHistory: TradeHistoryRecord[];
  refreshTrigger: number;
  sessionOpenPrice: number | null;
  chartData: MarketChartCandle[];
  liveCandle: MarketChartCandle | null;
  status: MarketConnectionStatus;
  setDemoBalance: (balance: number) => void;
  addOpenPosition: (position: OpenMarketPosition) => void;
  triggerTradeRefresh: () => void;
  setCurrentUser: (currentUser: CurrentUserProfile | null) => void;
  setViewAsUser: (userId: string | null, email?: string | null) => void;
  setTimeframe: (timeframe: MarketTimeframe) => void;
  fetchTradeHistory: (accessToken: string) => Promise<TradeHistoryRecord[]>;
  refreshOpenPositions: (accessToken: string) => Promise<OpenMarketPosition[]>;
  setSelectedSymbol: (symbol: string) => void;
  fetchPrice: (symbol: string) => Promise<void>;
  fetchGoldHistory: (interval: string, signal?: AbortSignal) => Promise<unknown>;
  startPricePolling: (symbol?: string) => void;
  stopPricePolling: () => void;
}

export function toMarketSymbol(symbol: string): string {
  const normalized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized === 'XAUUSD') return normalized;
  if (normalized.endsWith('USDT')) return normalized;
  if (normalized.endsWith('USD')) return `${normalized.slice(0, -3)}USDT`;
  return `${normalized}USDT`;
}

const POLL_INTERVAL_MS = 5000;

function parsePrice(value: unknown): number {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Market data API returned an invalid price.');
  }
  return price;
}

export const useMarketStore = create<MarketStore>((set, get) => {
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let requestGeneration = 0;

  const setLivePrice = (price: number) => {
    if (!Number.isFinite(price) || price <= 0) {
      console.error('Received an invalid live market price.', price);
      set({ status: 'error' });
      return;
    }

    useTradingStore.getState().setPrice(get().selectedSymbol, price);

    set((state) => {
      if (state.selectedSymbol !== 'XAUUSD' || state.chartData.length === 0) {
        return {
          livePrice: price,
          sessionOpenPrice: state.sessionOpenPrice ?? price,
          status: 'connected',
        };
      }

      const lastHistoricalTime = state.chartData[state.chartData.length - 1].time;
      const liveTime = lastHistoricalTime + 60;
      const previousLiveCandle =
        state.liveCandle?.time === liveTime ? state.liveCandle : null;
      const liveCandle = previousLiveCandle
        ? {
            ...previousLiveCandle,
            high: Math.max(previousLiveCandle.high, price),
            low: Math.min(previousLiveCandle.low, price),
            close: price,
          }
        : { time: liveTime, open: price, high: price, low: price, close: price };

      return {
        livePrice: price,
        sessionOpenPrice: state.sessionOpenPrice ?? price,
        liveCandle,
        status: 'connected',
      };
    });

  };

  const fetchPrice = async (symbol: string) => {
    const marketSymbol = toMarketSymbol(symbol);
    const requestId = ++requestGeneration;
    let price: number;

    if (marketSymbol === 'XAUUSD') {
      try {
        const response = await fetch('/.netlify/functions/market-price?symbol=XAUUSD');
        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Gold API price request returned an error response.', {
            status: response.status,
            response: errorBody,
          });

          throw new Error(`Gold API price request failed with HTTP ${response.status}.`);
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.toLowerCase().includes('application/json')) {
          const responseBody = await response.text();
          console.error('Gold API price request returned a non-JSON response.', {
            contentType,
            response: responseBody,
          });
          throw new Error('Gold API returned a non-JSON response.');
        }

        const data: unknown = await response.json();
        if (data === null || typeof data !== 'object' || !('price' in data)) {
          throw new Error('Gold API response did not contain a price.');
        }
        price = parsePrice(data.price);
      } catch (error) {
        console.error('Unable to fetch the XAU/USD live price from Gold API.', error);
        if (requestId === requestGeneration && get().selectedSymbol === marketSymbol) {
          set({ status: 'error' });
        }
        return;
      }

      if (requestId !== requestGeneration || get().selectedSymbol !== marketSymbol) return;
      setLivePrice(price);
      return;
    }

    try {
      const response = await fetch(
        `/.netlify/functions/market-price?symbol=${encodeURIComponent(marketSymbol)}`
      );
      if (!response.ok) {
        throw new Error(`Market price request failed with HTTP ${response.status}.`);
      }

      const data: unknown = await response.json();
      if (data === null || typeof data !== 'object' || !('price' in data)) {
        throw new Error('Market price response did not contain a price.');
      }
      price = parsePrice(data.price);
    } catch (error) {
      console.error(`Unable to fetch the ${marketSymbol} live price from the market proxy.`, error);
      if (requestId === requestGeneration && get().selectedSymbol === marketSymbol) {
        set({ status: 'error' });
      }
      return;
    }

    if (requestId !== requestGeneration || get().selectedSymbol !== marketSymbol) return;
    setLivePrice(price);
  };

  const fetchGoldHistory = async (interval: string, signal?: AbortSignal): Promise<unknown> => {
    const query = new URLSearchParams({ symbol: 'XAUUSD', interval });
    const response = await fetch(`/.netlify/functions/twelve-data?${query.toString()}`, { signal });
    const data: unknown = await response.json();
    console.log('RAW GOLD API RESPONSE:', data);

    if (!response.ok) {
      let errorMessage = `Historical XAU/USD request failed with HTTP ${response.status}.`;
      if (data !== null && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
        errorMessage = data.error;
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      console.error('Historical XAU/USD endpoint returned a non-JSON content type.', { contentType });
      throw new Error('Historical XAU/USD endpoint returned an invalid content type.');
    }

    if (data === null || typeof data !== 'object') {
      console.error('Twelve Data Error: historical response was not an object.', data);
      throw new Error('Historical XAU/USD response was invalid.');
    }

    let candles: MarketChartCandle[];
    if ('values' in data && Array.isArray(data.values)) {
      const sortedValues = data.values.slice().reverse();
      candles = sortedValues.map((value: unknown) => {
        if (value === null || typeof value !== 'object') {
          throw new Error('Twelve Data returned an invalid candle.');
        }

        const candle = value as Record<string, unknown>;
        if (typeof candle.datetime !== 'string') {
          throw new Error('Twelve Data candle did not contain a valid datetime.');
        }
        const time = Math.floor(
          new Date(candle.datetime.replace(' ', 'T') + 'Z').getTime() / 1000
        );
        const open = parseFloat(String(candle.open));
        const high = parseFloat(String(candle.high));
        const low = parseFloat(String(candle.low));
        const close = parseFloat(String(candle.close));
        if (
          !Number.isSafeInteger(time) ||
          time <= 0 ||
          ![open, high, low, close].every(Number.isFinite)
        ) {
          throw new Error('Twelve Data returned invalid XAU/USD candle data.');
        }

        return { time, open, high, low, close };
      });
    } else if ('candles' in data && Array.isArray(data.candles)) {
      candles = data.candles.map((value: unknown) => {
        if (value === null || typeof value !== 'object') {
          throw new Error('Twelve Data proxy returned an invalid candle.');
        }
        const candle = value as Record<string, unknown>;
        const time = Number(candle.time);
        const open = parseFloat(String(candle.open));
        const high = parseFloat(String(candle.high));
        const low = parseFloat(String(candle.low));
        const close = parseFloat(String(candle.close));
        if (
          !Number.isSafeInteger(time) ||
          time <= 0 ||
          ![open, high, low, close].every(Number.isFinite)
        ) {
          throw new Error('Twelve Data proxy returned invalid XAU/USD candle data.');
        }
        return { time, open, high, low, close };
      }).sort((a, b) => a.time - b.time);
    } else {
      console.error('Twelve Data Error: historical response contained neither values nor candles.', data);
      throw new Error('Historical XAU/USD response did not contain candles.');
    }

    set((state) => {
      const latestHistory = candles[candles.length - 1];
      const liveCandle = latestHistory && state.selectedSymbol === 'XAUUSD' && state.livePrice !== null
        ? {
            time: latestHistory.time + 60,
            open: state.livePrice,
            high: state.livePrice,
            low: state.livePrice,
            close: state.livePrice,
          }
        : null;
      return { chartData: candles, liveCandle };
    });
    return { candles };
  };

  const stopPricePolling = () => {
    requestGeneration += 1;
    if (pollInterval !== null) clearInterval(pollInterval);
    pollInterval = null;
    set({ status: 'disconnected' });
  };

  const startPricePolling = (symbol = get().selectedSymbol) => {
    if (pollInterval !== null) clearInterval(pollInterval);
    requestGeneration += 1;
    const marketSymbol = toMarketSymbol(symbol);
    set({ status: 'connecting' });
    void fetchPrice(marketSymbol);
    pollInterval = setInterval(() => {
      void fetchPrice(marketSymbol);
    }, POLL_INTERVAL_MS);
  };

  return {
    selectedSymbol: 'BTCUSDT',
    timeframe: '1M',
    livePrice: null,
    demoBalance: null,
    currentUser: null,
    viewAsUserId: null,
    viewAsUserEmail: null,
    openPositions: [],
    tradeHistory: [],
    refreshTrigger: 0,
    sessionOpenPrice: null,
    chartData: [],
    liveCandle: null,
    status: 'disconnected',

    setDemoBalance: (demoBalance) => {
      if (!Number.isFinite(demoBalance) || demoBalance < 0) {
        console.error('Received an invalid demo balance.', demoBalance);
        return;
      }
      set({ demoBalance });
    },

    addOpenPosition: (position) => {
      set((state) => ({
        openPositions: [
          position,
          ...state.openPositions.filter((current) => current.id !== position.id),
        ],
      }));
    },

    triggerTradeRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

    setCurrentUser: (currentUser) => set({ currentUser }),

    setViewAsUser: (viewAsUserId, email = null) => {
      if (viewAsUserId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(viewAsUserId)) {
        console.error('Refusing an invalid view-as account ID.');
        return;
      }

      set({
        viewAsUserId,
        viewAsUserEmail: viewAsUserId ? email : null,
        demoBalance: null,
        openPositions: [],
        tradeHistory: [],
      });
    },

    setTimeframe: (timeframe) => set({ timeframe }),

    fetchTradeHistory: async (accessToken) => {
      const { viewAsUserId } = get();
      const response = await fetch('/.netlify/functions/get-trades', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(viewAsUserId ? { 'X-View-As-User': viewAsUserId } : {}),
        },
      });
      const result: unknown = await response.json();

      if (
        !response.ok ||
        result === null ||
        typeof result !== 'object' ||
        !('success' in result) ||
        result.success !== true ||
        !('trades' in result) ||
        !Array.isArray(result.trades)
      ) {
        const message = result !== null && typeof result === 'object'
          ? ('error' in result && typeof result.error === 'string'
            ? result.error
            : 'message' in result && typeof result.message === 'string'
              ? result.message
              : `Trade history request failed (${response.status})`)
          : `Trade history request failed (${response.status})`;
        throw new Error(message);
      }

      const trades = result.trades.map((value: unknown): TradeHistoryRecord => {
        if (value === null || typeof value !== 'object') {
          throw new Error('Trade history response contains an invalid entry.');
        }
        const trade = value as Record<string, unknown>;
        if (
          typeof trade.id !== 'string' ||
          typeof trade.symbol !== 'string' ||
          (trade.side !== 'buy' && trade.side !== 'sell') ||
          typeof trade.amount !== 'number' ||
          !Number.isFinite(trade.amount) ||
          typeof trade.price !== 'number' ||
          !Number.isFinite(trade.price) ||
          typeof trade.createdAt !== 'string' ||
          !(trade.closedAt === null || typeof trade.closedAt === 'string')
        ) {
          throw new Error('Trade history response contains invalid trade data.');
        }
        return {
          id: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          amount: trade.amount,
          price: trade.price,
          createdAt: trade.createdAt,
          closedAt: trade.closedAt,
        };
      });
      set({ tradeHistory: trades });
      useTradingStore.getState().setTrades(trades);
      return trades;
    },

    refreshOpenPositions: async (accessToken) => {
      const { viewAsUserId } = get();
      const response = await fetch('/.netlify/functions/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(viewAsUserId ? { 'X-View-As-User': viewAsUserId } : {}),
        },
        body: JSON.stringify({ action: 'positions' }),
      });
      const result: unknown = await response.json();

      if (
        !response.ok ||
        result === null ||
        typeof result !== 'object' ||
        !('success' in result) ||
        result.success !== true ||
        !('positions' in result) ||
        !Array.isArray(result.positions)
      ) {
        const message = result !== null && typeof result === 'object'
          ? ('error' in result && typeof result.error === 'string'
            ? result.error
            : 'message' in result && typeof result.message === 'string'
              ? result.message
              : `Position refresh failed (${response.status})`)
          : `Position refresh failed (${response.status})`;
        throw new Error(message);
      }

      const positions = result.positions.map((value: unknown): OpenMarketPosition => {
        if (value === null || typeof value !== 'object') {
          throw new Error('Position response contains an invalid entry.');
        }

        const position = value as Record<string, unknown>;
        if (
          typeof position.id !== 'string' ||
          typeof position.symbol !== 'string' ||
          typeof position.amount !== 'number' ||
          !Number.isFinite(position.amount) ||
          typeof position.price !== 'number' ||
          !Number.isFinite(position.price) ||
          (position.side !== 'buy' && position.side !== 'sell') ||
          typeof position.contractSize !== 'number' ||
          !Number.isFinite(position.contractSize) ||
          typeof position.createdAt !== 'string'
        ) {
          throw new Error('Position response contains invalid trade data.');
        }

        return {
          id: position.id,
          symbol: position.symbol,
          amount: position.amount,
          price: position.price,
          side: position.side,
          contractSize: position.contractSize,
          createdAt: position.createdAt,
        };
      });

      set({ openPositions: positions });
      return positions;
    },

    setSelectedSymbol: (symbol) => {
      const nextSymbol = toMarketSymbol(symbol);
      if (!/^[A-Z0-9]{5,12}$/.test(nextSymbol)) {
        console.error(`Invalid market symbol: ${symbol}`);
        return;
      }
      if (get().selectedSymbol === nextSymbol) return;

      requestGeneration += 1;
      set({
        selectedSymbol: nextSymbol,
        livePrice: null,
        sessionOpenPrice: null,
        chartData: [],
        liveCandle: null,
        status: 'disconnected',
      });
    },

    fetchPrice,
    fetchGoldHistory,
    startPricePolling,
    stopPricePolling,
  };
});

export function getViewAsHeaders(): Record<string, string> {
  const { viewAsUserId } = useMarketStore.getState();
  return viewAsUserId ? { 'X-View-As-User': viewAsUserId } : {};
}
