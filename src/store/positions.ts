export type TradeSide = 'buy' | 'sell';
export type PositionSide = 'LONG' | 'SHORT';

/**
 * Contract size (units per lot) for each supported market symbol.
 * PnL must always be scaled by the contract size of the traded instrument:
 *   PnL = (livePrice - avgPrice) * netAmount * contractSize
 */
export const CONTRACT_SIZES: Record<string, number> = {
  BTCUSDT: 1,
  ETHUSDT: 10,
  SOLUSDT: 1,
  XRPUSDT: 1,
  PAXGUSDT: 1,
  XAUUSD: 1,
};

/** Returns the contract size for a symbol, defaulting to 1 for unknown symbols. */
export function getContractSize(symbol: string): number {
  const normalized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const size = CONTRACT_SIZES[normalized] ?? 1;
  return Number.isFinite(size) && size > 0 ? size : 1;
}

export interface Trade {
  id: string;
  symbol: string;
  side: TradeSide;
  amount: number;
  price: number;
  createdAt: string;
  closedAt?: string | null;
}

export interface Position {
  symbol: string;
  side: PositionSide;
  size: number; // Absolute size
  netAmount: number; // Signed net amount: positive for LONG, negative for SHORT
  avgPrice: number;
  buyAmount: number;
  sellAmount: number;
}

const EPSILON = 1e-8;

/**
 * Builds TradingView-style Margin/CFD positions (Long & Short) from trade history.
 * Net Amount = (Total Buys - Total Sells).
 * If Net Amount > 0 => LONG.
 * If Net Amount < 0 => SHORT.
 * Calculates dynamic weighted average entry price across adds, reductions, and position flips.
 */
export function buildPositions(trades: Trade[]): Position[] {
  // Sort trades chronologically from oldest to newest
  const sortedTrades = [...trades].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const grouped = new Map<
    string,
    {
      netAmount: number;
      avgPrice: number;
      buyAmount: number;
      sellAmount: number;
    }
  >();

  for (const trade of sortedTrades) {
    const amount = Number.parseFloat(String(trade.amount));
    const price = Number.parseFloat(String(trade.price));
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(price) || price <= 0) {
      continue;
    }

    const current = grouped.get(trade.symbol) ?? {
      netAmount: 0,
      avgPrice: 0,
      buyAmount: 0,
      sellAmount: 0,
    };

    if (trade.side === 'buy') {
      current.buyAmount += amount;

      if (current.netAmount >= 0) {
        // Adding to Long position or opening new Long
        const newNet = current.netAmount + amount;
        current.avgPrice = newNet > 0
          ? (current.avgPrice * current.netAmount + price * amount) / newNet
          : price;
        current.netAmount = newNet;
      } else {
        // Reducing or flipping Short position
        const shortSize = Math.abs(current.netAmount);
        if (amount < shortSize - EPSILON) {
          // Partially covering Short: entry price stays identical
          current.netAmount += amount;
        } else if (Math.abs(amount - shortSize) <= EPSILON) {
          // Fully closed Short position
          current.netAmount = 0;
          current.avgPrice = 0;
        } else {
          // Flipped from Short to Long
          const remainingLong = amount - shortSize;
          current.netAmount = remainingLong;
          current.avgPrice = price;
        }
      }
    } else if (trade.side === 'sell') {
      current.sellAmount += amount;

      if (current.netAmount <= 0) {
        // Adding to Short position or opening new Short
        const currentShortSize = Math.abs(current.netAmount);
        const newShortSize = currentShortSize + amount;
        current.avgPrice = newShortSize > 0
          ? (current.avgPrice * currentShortSize + price * amount) / newShortSize
          : price;
        current.netAmount = -newShortSize;
      } else {
        // Reducing or flipping Long position
        const longSize = current.netAmount;
        if (amount < longSize - EPSILON) {
          // Partially closing Long: entry price stays identical
          current.netAmount -= amount;
        } else if (Math.abs(amount - longSize) <= EPSILON) {
          // Fully closed Long position
          current.netAmount = 0;
          current.avgPrice = 0;
        } else {
          // Flipped from Long to Short
          const remainingShort = amount - longSize;
          current.netAmount = -remainingShort;
          current.avgPrice = price;
        }
      }
    }

    grouped.set(trade.symbol, current);
  }

  const positions: Position[] = [];

  for (const [symbol, data] of grouped.entries()) {
    if (data.netAmount > EPSILON) {
      positions.push({
        symbol,
        side: 'LONG',
        size: data.netAmount,
        netAmount: data.netAmount,
        avgPrice: data.avgPrice,
        buyAmount: data.buyAmount,
        sellAmount: data.sellAmount,
      });
    } else if (data.netAmount < -EPSILON) {
      positions.push({
        symbol,
        side: 'SHORT',
        size: Math.abs(data.netAmount),
        netAmount: data.netAmount,
        avgPrice: data.avgPrice,
        buyAmount: data.buyAmount,
        sellAmount: data.sellAmount,
      });
    }
  }

  return positions;
}
