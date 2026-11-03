import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';
import { useMarketStore } from '../store/useMarketStore';

const tradingViewSymbols: Record<string, string> = {
  BTCUSDT: 'BINANCE:BTCUSDT',
  'BTC/USD': 'BINANCE:BTCUSDT',
  BTC: 'BINANCE:BTCUSDT',
  ETHUSDT: 'BINANCE:ETHUSDT',
  'ETH/USD': 'BINANCE:ETHUSDT',
  ETH: 'BINANCE:ETHUSDT',
  SOLUSDT: 'BINANCE:SOLUSDT',
  'SOL/USD': 'BINANCE:SOLUSDT',
  SOL: 'BINANCE:SOLUSDT',
  XRPUSDT: 'BINANCE:XRPUSDT',
  'XRP/USD': 'BINANCE:XRPUSDT',
  XRP: 'BINANCE:XRPUSDT',
  PAXGUSDT: 'BINANCE:PAXGUSDT',
  'PAXG / GOLD': 'BINANCE:PAXGUSDT',
  PAXG: 'BINANCE:PAXGUSDT',
  XAUUSD: 'OANDA:XAUUSD',
  'XAU/USD': 'OANDA:XAUUSD',
  GOLD: 'OANDA:XAUUSD',
};

const tradingViewIntervals: Record<string, '1' | '5' | '15' | '60' | '240' | 'D'> = {
  '1M': '1',
  '5M': '5',
  '15M': '15',
  '1H': '60',
  '4H': '240',
  '1D': 'D',
};

export function TradingPriceChart() {
  const selectedSymbol = useMarketStore((store) => store.selectedSymbol);
  const timeframe = useMarketStore((store) => store.timeframe);

  const cleanKey = selectedSymbol?.trim().toUpperCase();
  const symbol =
    tradingViewSymbols[cleanKey] ??
    tradingViewSymbols[cleanKey.replace('/', '')] ??
    `BINANCE:${cleanKey.replace(/[^A-Z0-9]/g, '')}`;

  return (
    <div className="h-[360px] min-w-0 w-full overflow-hidden sm:h-[440px] lg:h-[520px]">
      <AdvancedRealTimeChart
        key={`${symbol}-${timeframe}`}
        autosize
        allow_symbol_change={false}
        hide_top_toolbar={false}
        hide_side_toolbar={false}
        interval={tradingViewIntervals[timeframe] ?? '1'}
        symbol={symbol}
        theme="dark"
      />
    </div>
  );
}

export default TradingPriceChart;
