export interface MarketInstrument {
  symbol: string;
  name: string;
  feedSymbol?: string;
  pipSize: number;
  decimals: number;
  contractSize: number;
  category: 'Crypto' | 'Metal';
  icon: string;
}

export const MARKET_INSTRUMENTS: MarketInstrument[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar (Binance BTC/USDT)', feedSymbol: 'BTCUSDT', pipSize: 1.00, decimals: 2, contractSize: 1, category: 'Crypto', icon: '₿' },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', feedSymbol: 'ETHUSDT', pipSize: 0.10, decimals: 2, contractSize: 10, category: 'Crypto', icon: 'Ξ' },
  { symbol: 'SOL/USD', name: 'Solana / US Dollar', feedSymbol: 'SOLUSDT', pipSize: 0.01, decimals: 2, contractSize: 1, category: 'Crypto', icon: '◎' },
  { symbol: 'XRP/USD', name: 'XRP / US Dollar', feedSymbol: 'XRPUSDT', pipSize: 0.0001, decimals: 4, contractSize: 1, category: 'Crypto', icon: 'X' },
  { symbol: 'PAXG / GOLD', name: 'PAXG / GOLD', feedSymbol: 'PAXGUSDT', pipSize: 0.01, decimals: 2, contractSize: 1, category: 'Crypto', icon: 'Au' },
  { symbol: 'XAU/USD', name: 'XAU / GOLD', feedSymbol: 'XAUUSD', pipSize: 0.01, decimals: 2, contractSize: 1, category: 'Metal', icon: 'Au' },
];
