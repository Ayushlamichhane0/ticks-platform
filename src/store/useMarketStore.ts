import { useSyncExternalStore } from 'react';

export type MarketConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface MarketTrade {
  id: number;
  price: number;
  quantity: number;
  timestamp: number;
}

export interface MarketState {
  btcPrice: number | null;
  btcSessionOpenPrice: number | null;
  btcTrades: MarketTrade[];
  btcStatus: MarketConnectionStatus;
  goldPrice: number | null;
  goldSessionOpenPrice: number | null;
  goldTrades: MarketTrade[];
  goldStatus: MarketConnectionStatus;
}

type MarketSymbol = 'btcusdt' | 'paxgusdt';

interface BinanceTradeMessage {
  p: string;
  q: string;
  T: number;
}

const BINANCE_STREAM_URLS = [
  'wss://stream.binance.com:443/ws',
  'wss://data-stream.binance.vision/ws',
];
const NOTIFY_INTERVAL_MS = 250;
const MAX_STORED_TRADES = 500;
const MAX_RECONNECT_DELAY_MS = 30_000;

let state: MarketState = {
  btcPrice: null,
  btcSessionOpenPrice: null,
  btcTrades: [],
  btcStatus: 'disconnected',
  goldPrice: null,
  goldSessionOpenPrice: null,
  goldTrades: [],
  goldStatus: 'disconnected',
};

const listeners = new Set<() => void>();
const sockets = new Map<MarketSymbol, WebSocket>();
const reconnectTimers = new Map<MarketSymbol, ReturnType<typeof setTimeout>>();
const reconnectAttempts = new Map<MarketSymbol, number>();
let notificationTimer: ReturnType<typeof setTimeout> | null = null;
let nextTradeId = 1;

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function updateState(nextState: MarketState, immediate = false) {
  state = nextState;

  if (immediate) {
    if (notificationTimer !== null) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }
    notifyListeners();
    return;
  }

  if (notificationTimer === null) {
    notificationTimer = setTimeout(() => {
      notificationTimer = null;
      notifyListeners();
    }, NOTIFY_INTERVAL_MS);
  }
}

function setSymbolStatus(symbol: MarketSymbol, status: MarketConnectionStatus) {
  updateState(
    symbol === 'btcusdt'
      ? { ...state, btcStatus: status }
      : { ...state, goldStatus: status },
    true
  );
}

function scheduleReconnect(symbol: MarketSymbol) {
  if (listeners.size === 0 || reconnectTimers.has(symbol)) return;

  const attempts = reconnectAttempts.get(symbol) ?? 0;
  const delay = Math.min(1000 * (2 ** attempts), MAX_RECONNECT_DELAY_MS);
  reconnectAttempts.set(symbol, attempts + 1);
  setSymbolStatus(symbol, 'error');

  const timer = setTimeout(() => {
    reconnectTimers.delete(symbol);
    connectSymbol(symbol);
  }, delay);
  reconnectTimers.set(symbol, timer);
}

function connectSymbol(symbol: MarketSymbol) {
  if (listeners.size === 0 || sockets.has(symbol)) return;

  setSymbolStatus(symbol, 'connecting');
  const attempts = reconnectAttempts.get(symbol) ?? 0;
  const streamUrl = BINANCE_STREAM_URLS[attempts % BINANCE_STREAM_URLS.length];
  let connection: WebSocket;
  try {
    connection = new WebSocket(`${streamUrl}/${symbol}@trade`);
  } catch (error) {
    console.error(`Unable to open Binance ${symbol.toUpperCase()} WebSocket.`, error);
    scheduleReconnect(symbol);
    return;
  }
  sockets.set(symbol, connection);

  connection.onopen = () => {
    if (sockets.get(symbol) !== connection) return;
    reconnectAttempts.set(symbol, 0);
    setSymbolStatus(symbol, 'connected');
  };

  connection.onmessage = (event: MessageEvent<string>) => {
    if (sockets.get(symbol) !== connection) return;

    let message: BinanceTradeMessage;
    try {
      message = JSON.parse(event.data) as BinanceTradeMessage;
    } catch (error) {
      console.error(`Unable to parse Binance ${symbol.toUpperCase()} trade message.`, error);
      return;
    }

    const price = Number(message.p);
    const quantity = Number(message.q);
    const timestamp = Number(message.T);
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      !Number.isFinite(timestamp)
    ) {
      console.error(`Received an invalid Binance ${symbol.toUpperCase()} trade message.`, message);
      return;
    }

    const trade: MarketTrade = { id: nextTradeId++, price, quantity, timestamp };
    if (symbol === 'btcusdt') {
      updateState({
        ...state,
        btcPrice: price,
        btcSessionOpenPrice: state.btcSessionOpenPrice ?? price,
        btcTrades: [...state.btcTrades.slice(-(MAX_STORED_TRADES - 1)), trade],
        btcStatus: 'connected',
      });
    } else {
      updateState({
        ...state,
        goldPrice: price,
        goldSessionOpenPrice: state.goldSessionOpenPrice ?? price,
        goldTrades: [...state.goldTrades.slice(-(MAX_STORED_TRADES - 1)), trade],
        goldStatus: 'connected',
      });
    }
  };

  connection.onerror = (event) => {
    if (sockets.get(symbol) !== connection) return;
    console.error(`Binance ${symbol.toUpperCase()} WebSocket encountered an error.`, event);
    setSymbolStatus(symbol, 'error');
    connection.close();
  };

  connection.onclose = () => {
    if (sockets.get(symbol) !== connection) return;
    sockets.delete(symbol);
    scheduleReconnect(symbol);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    connectSymbol('btcusdt');
    connectSymbol('paxgusdt');
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;

    if (notificationTimer !== null) {
      clearTimeout(notificationTimer);
      notificationTimer = null;
    }

    reconnectTimers.forEach((timer) => clearTimeout(timer));
    reconnectTimers.clear();
    reconnectAttempts.clear();

    sockets.forEach((connection) => {
      connection.onopen = null;
      connection.onmessage = null;
      connection.onerror = null;
      connection.onclose = null;
      connection.close();
    });
    sockets.clear();

    updateState({ ...state, btcStatus: 'disconnected', goldStatus: 'disconnected' }, true);
  };
}

function getSnapshot() {
  return state;
}

export function useMarketStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
