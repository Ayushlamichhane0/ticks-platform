import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getAuthAccessToken } from '../auth';
import { getViewAsHeaders, useMarketStore } from '../store/useMarketStore';
import { buildPositions, type Position } from '../store/positions';
import { useTradingStore } from '../store/useTradingStore';

type TerminalTab = 'positions' | 'orders' | 'history';

const tabs: { id: TerminalTab; label: string }[] = [
  { id: 'positions', label: 'Positions' },
  { id: 'orders', label: 'Orders' },
  { id: 'history', label: 'History' },
];

const formatPrice = (price: number) =>
  `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`;

const formatPnl = (pnl: number) =>
  `${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Contract size (units per lot) for each market symbol. Used to scale the notional
// value of an order when it is submitted to the backend trade function.
const CONTRACT_SIZES: Record<string, number> = {
  BTCUSDT: 1,
  ETHUSDT: 10,
  SOLUSDT: 1,
  XRPUSDT: 1,
  PAXGUSDT: 1,
  XAUUSD: 1,
};

const getContractSize = (symbol: string): number => {
  const normalized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const size = CONTRACT_SIZES[normalized] ?? 1;
  return Number.isFinite(size) && size > 0 ? size : 1;
};

export function TradingTerminal() {
  const [activeTab, setActiveTab] = useState<TerminalTab>('positions');
  const [isLoading, setIsLoading] = useState(true);
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshTrigger = useMarketStore((store) => store.refreshTrigger);
  const viewAsUserId = useMarketStore((store) => store.viewAsUserId);
  const fetchTradeHistory = useMarketStore((store) => store.fetchTradeHistory);
  const triggerTradeRefresh = useMarketStore((store) => store.triggerTradeRefresh);

  const trades = useTradingStore((store) => store.trades);
  const prices = useTradingStore((store) => store.prices);
  const setTrades = useTradingStore((store) => store.setTrades);

  const positions = useMemo(() => buildPositions(trades), [trades]);
  const openTrades = useMemo(
    () => trades.filter((trade) => trade.closedAt == null),
    [trades]
  );

  const refreshTrades = useCallback(async () => {
    const accessToken = await getAuthAccessToken();
    const nextTrades = await fetchTradeHistory(accessToken);
    setTrades(nextTrades);
  }, [fetchTradeHistory, setTrades]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMessage(null);

    void refreshTrades()
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load trading activity.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshTrades, refreshTrigger, viewAsUserId]);

  const closePosition = async (p: Position) => {
    if (viewAsUserId) return;

    const livePrice =
      prices[p.symbol] ??
      (p.symbol === useMarketStore.getState().selectedSymbol
        ? useMarketStore.getState().livePrice
        : null) ??
      p.avgPrice;

    if (!Number.isFinite(livePrice) || livePrice <= 0) {
      toast.error(`Waiting for live price for ${p.symbol}`);
      return;
    }

    if (!Number.isFinite(p.size) || p.size <= 0) return;

    // To close LONG position => SELL size; to close SHORT position => BUY size
    const closingSide: 'buy' | 'sell' = p.side === 'LONG' ? 'sell' : 'buy';

    setClosingSymbol(p.symbol);
    setErrorMessage(null);

    try {
      const accessToken = await getAuthAccessToken();
      const response = await fetch('/.netlify/functions/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...getViewAsHeaders(),
        },
        body: JSON.stringify({
          action: 'open',
          symbol: p.symbol,
          side: closingSide,
          // Send the notional amount scaled by the instrument contract size so the
          // backend can compute realized PnL consistently (amount * price * contractSize).
          amount: p.size * getContractSize(p.symbol),
          price: livePrice,
          contractSize: getContractSize(p.symbol),
        }),
      });
      const result: unknown = await response.json();
      const failed =
        !response.ok ||
        result === null ||
        typeof result !== 'object' ||
        !('success' in result) ||
        result.success !== true;

      if (failed) {
        const message =
          result !== null && typeof result === 'object'
            ? ('message' in result && typeof result.message === 'string'
              ? result.message
              : 'error' in result && typeof result.error === 'string'
                ? result.error
                : `Close failed for ${p.symbol} (${response.status})`)
            : `Close failed for ${p.symbol} (${response.status})`;
        throw new Error(message);
      }

      toast.success(`Closed ${p.side} position for ${p.symbol}`);
      await refreshTrades();
      triggerTradeRefresh();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : `Unable to close ${p.symbol}.`;
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setClosingSymbol(null);
    }
  };

  return (
    <section className="mt-4 flex h-[30vh] min-h-64 flex-col overflow-hidden border border-white/10 bg-[#0b0b0b] text-white shadow-xl shadow-black/30">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#111111] px-4">
        <nav aria-label="Trading terminal tabs" className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`border-b-2 px-4 py-3 font-mono-geist text-xs transition ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-white/45 hover:text-white/80'
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
              {tab.id === 'positions' && (
                <span className="ml-2 text-[10px] text-white/40">{positions.length}</span>
              )}
              {tab.id === 'history' && (
                <span className="ml-2 text-[10px] text-white/40">{trades.length}</span>
              )}
            </button>
          ))}
        </nav>
        <span className="hidden font-mono-geist text-[10px] uppercase tracking-wider text-white/30 sm:block">
          {viewAsUserId ? 'Read-only account data' : 'Account activity'}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {errorMessage && (
          <p className="m-4 border border-rose-500/25 bg-rose-500/5 p-3 font-mono-geist text-xs text-rose-300" role="alert">
            {errorMessage}
          </p>
        )}
        {isLoading ? (
          <p className="px-4 py-8 text-center font-mono-geist text-xs text-white/45">Loading account activity…</p>
        ) : activeTab === 'positions' ? (
          positions.length === 0 ? (
            <p className="px-4 py-8 text-center font-mono-geist text-xs text-white/45">No open positions.</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left font-mono-geist text-xs">
              <thead className="sticky top-0 bg-[#0b0b0b] text-[10px] uppercase tracking-wide text-white/40">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2.5 font-normal">Symbol</th>
                  <th className="px-4 py-2.5 font-normal">Side</th>
                  <th className="px-4 py-2.5 text-right font-normal">Size</th>
                  <th className="px-4 py-2.5 text-right font-normal">Entry Price</th>
                  <th className="px-4 py-2.5 text-right font-normal">Mark Price</th>
                  <th className="px-4 py-2.5 text-right font-normal">PnL</th>
                  <th className="px-4 py-2.5 text-right font-normal">Close</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {positions.map((position) => {
                  const livePrice =
                    prices[position.symbol] ??
                    (position.symbol === useMarketStore.getState().selectedSymbol
                      ? useMarketStore.getState().livePrice
                      : null);
                  const hasPrice = Number.isFinite(livePrice);
                  // PnL must include the contract size of the instrument:
                  // (livePrice - avgPrice) * netAmount * contractSize
                  const contractSize = getContractSize(position.symbol);
                  const pnl = hasPrice && livePrice !== null
                    ? (livePrice - position.avgPrice) * position.netAmount * contractSize
                    : null;
                  const isClosing = closingSymbol === position.symbol;

                  return (
                    <tr className="hover:bg-white/[0.03]" key={position.symbol}>
                      <td className="px-4 py-2.5 font-semibold text-white">{position.symbol}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block border px-2 py-0.5 font-mono-geist text-[10px] font-bold uppercase tracking-wider ${
                            position.side === 'LONG'
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                              : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {position.side}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-white">
                        {position.size.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 4,
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right text-white/70">
                        {formatPrice(position.avgPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-white/70">
                        {hasPrice && livePrice !== null ? formatPrice(livePrice) : '—'}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-bold ${
                          pnl === null ? 'text-white/30' : pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pnl === null ? 'Waiting for price' : formatPnl(pnl)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          className="border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={!hasPrice || closingSymbol !== null || viewAsUserId !== null}
                          onClick={() => void closePosition(position)}
                          title={
                            viewAsUserId
                              ? 'View-as mode is read-only'
                              : hasPrice
                                ? `Close ${position.side} position at market price`
                                : 'Waiting for live price'
                          }
                          type="button"
                        >
                          {isClosing ? 'Closing…' : 'Close'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : activeTab === 'orders' ? (
          openTrades.length === 0 ? (
            <p className="px-4 py-8 text-center font-mono-geist text-xs text-white/45">No active orders.</p>
          ) : (
            <table className="w-full min-w-[600px] border-collapse text-left font-mono-geist text-xs">
              <thead className="sticky top-0 bg-[#0b0b0b] text-[10px] uppercase tracking-wide text-white/40">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2.5 font-normal">Opened</th>
                  <th className="px-4 py-2.5 font-normal">Symbol</th>
                  <th className="px-4 py-2.5 font-normal">Side</th>
                  <th className="px-4 py-2.5 text-right font-normal">Size</th>
                  <th className="px-4 py-2.5 text-right font-normal">Fill price</th>
                  <th className="px-4 py-2.5 text-right font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {openTrades.map((trade) => (
                  <tr className="hover:bg-white/[0.03]" key={trade.id}>
                    <td className="px-4 py-2.5 text-white/50">{new Date(trade.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-semibold">{trade.symbol}</td>
                    <td className={`px-4 py-2.5 font-bold uppercase ${trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trade.side}
                    </td>
                    <td className="px-4 py-2.5 text-right">{trade.amount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{formatPrice(trade.price)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400">OPEN</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : trades.length === 0 ? (
          <p className="px-4 py-8 text-center font-mono-geist text-xs text-white/45">No trade history.</p>
        ) : (
          <table className="w-full min-w-[600px] border-collapse text-left font-mono-geist text-xs">
            <thead className="sticky top-0 bg-[#0b0b0b] text-[10px] uppercase tracking-wide text-white/40">
              <tr className="border-b border-white/10">
                <th className="px-4 py-2.5 font-normal">Date</th>
                <th className="px-4 py-2.5 font-normal">Symbol</th>
                <th className="px-4 py-2.5 font-normal">Side</th>
                <th className="px-4 py-2.5 text-right font-normal">Size</th>
                <th className="px-4 py-2.5 text-right font-normal">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {trades.map((trade) => (
                <tr className="hover:bg-white/[0.03]" key={trade.id}>
                  <td className="px-4 py-2.5 text-white/50">{new Date(trade.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-semibold">{trade.symbol}</td>
                  <td className={`px-4 py-2.5 font-bold uppercase ${trade.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trade.side}
                  </td>
                  <td className="px-4 py-2.5 text-right">{trade.amount.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">{formatPrice(trade.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default TradingTerminal;
