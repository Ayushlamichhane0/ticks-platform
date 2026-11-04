import { create } from 'zustand';
import { buildPositions, getContractSize, type Position, type PositionSide, type Trade } from './positions';

export { buildPositions, CONTRACT_SIZES, getContractSize, type Position, type PositionSide, type Trade };

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
      // PnL must include the contract size of the instrument:
      // (livePrice - avgPrice) * netAmount * contractSize
      const contractSize = getContractSize(pos.symbol);
      const pnl = (livePrice - pos.avgPrice) * pos.netAmount * contractSize;
      return total + pnl;
    }, 0);
    return cashBalance + totalPnl;
  },
}));
