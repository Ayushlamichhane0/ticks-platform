import { create } from 'zustand';
import { buildPositions, type Position, type PositionSide, type Trade } from './positions';

export { buildPositions, type Position, type PositionSide, type Trade };

interface TradingStore {
  trades: Trade[];
  prices: Record<string, number>;
  setTrades: (trades: Trade[]) => void;
  setPrice: (symbol: string, price: number) => void;
  getPositions: () => Position[];
  getTotalEquity: (cashBalance?: number) => number;
}

export const useTradingStore = create<TradingStore>((set, get) => ({
  trades: [],
  prices: {},

  setTrades: (trades) => set({ trades }),

  setPrice: (symbol, price) => {
    if (!symbol || !Number.isFinite(price) || price <= 0) return;
    set((state) => ({
      prices: {
        ...state.prices,
        [symbol]: price,
      },
    }));
  },

  getPositions: () => {
    return buildPositions(get().trades);
  },

  getTotalEquity: (cashBalance = 0) => {
    const { trades, prices } = get();
    const positions = buildPositions(trades);
    const totalPnl = positions.reduce((total, pos) => {
      const livePrice = prices[pos.symbol] ?? pos.avgPrice;
      const pnl = pos.side === 'LONG'
        ? (livePrice - pos.avgPrice) * pos.size
        : (pos.avgPrice - livePrice) * pos.size;
      return total + pnl;
    }, 0);
    return cashBalance + totalPnl;
  },
}));
