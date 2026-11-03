import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { getAuthAccessToken } from '../auth';
import { getViewAsHeaders, useMarketStore } from '../store/useMarketStore';

interface OrderPanelProps {
  symbol?: string;
  currentPrice?: number | null;
  onTradeSuccess?: () => void;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({
  symbol: propSymbol,
  currentPrice: propPrice,
  onTradeSuccess,
}) => {
  const selectedSymbol = useMarketStore((store) => store.selectedSymbol);
  const livePrice = useMarketStore((store) => store.livePrice);
  const viewAsUserId = useMarketStore((store) => store.viewAsUserId);
  const triggerTradeRefresh = useMarketStore((store) => store.triggerTradeRefresh);

  const activeSymbol = propSymbol || selectedSymbol;
  const activePrice = propPrice !== undefined ? propPrice : livePrice;

  const [lotSizeInput, setLotSizeInput] = useState<string>('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executingSide, setExecutingSide] = useState<'buy' | 'sell' | null>(null);

  const parsedLotSize = Number.parseFloat(lotSizeInput);

  const handleExecuteOrder = async (side: 'buy' | 'sell') => {
    if (viewAsUserId) {
      toast.error('Trading is disabled in view-as mode.');
      return;
    }

    const amount = Number.parseFloat(lotSizeInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid lot size greater than 0.');
      return;
    }

    const price = typeof activePrice === 'number' && Number.isFinite(activePrice) ? activePrice : null;
    if (price === null || price <= 0) {
      toast.error('Waiting for live price feed...');
      return;
    }

    setIsSubmitting(true);
    setExecutingSide(side);

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
          symbol: activeSymbol,
          side,
          amount, // strictly floating-point number
          price,  // strictly floating-point number
        }),
      });

      const result = await response.json() as {
        success?: boolean;
        message?: string;
        error?: string;
        tradeId?: string;
        newBalance?: number;
      };

      if (!response.ok || result?.success === false) {
        const errorMsg = result?.message || result?.error || `Order failed (${response.status})`;
        toast.error(errorMsg);
        return;
      }

      toast.success(`${side.toUpperCase()} order executed for ${amount} ${activeSymbol}`);
      triggerTradeRefresh();
      onTradeSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Network error placing order');
    } finally {
      setIsSubmitting(false);
      setExecutingSide(null);
    }
  };

  return (
    <div className="border border-white/10 bg-[#0e0e0e] p-4 font-mono-geist text-white">
      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
        <span className="font-silkscreen text-xs uppercase text-white/50">ORDER PANEL</span>
        <span className="text-xs font-bold text-amber-300">{activeSymbol}</span>
      </div>

      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <label htmlFor="order-lot-size" className="text-white/60">
            LOT SIZE (VOLUME)
          </label>
          <span className="font-bold text-white">
            {Number.isFinite(parsedLotSize) && parsedLotSize > 0 ? parsedLotSize : '—'} LOTS
          </span>
        </div>

        <input
          id="order-lot-size"
          type="number"
          step="0.01"
          min="0.0001"
          value={lotSizeInput}
          onChange={(e) => setLotSizeInput(e.target.value)}
          disabled={Boolean(viewAsUserId) || isSubmitting}
          className="w-full border border-white/20 bg-black px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-emerald-400"
          placeholder="0.10"
        />

        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {[0.1, 0.5, 1.0, 5.0].map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={Boolean(viewAsUserId) || isSubmitting}
              onClick={() => setLotSizeInput(String(preset))}
              className={`border py-1 text-[11px] font-silkscreen transition ${
                parsedLotSize === preset
                  ? 'border-white bg-white font-bold text-black'
                  : 'border-white/15 text-white/60 hover:border-white/40'
              }`}
            >
              {preset}L
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void handleExecuteOrder('sell')}
          disabled={Boolean(viewAsUserId) || isSubmitting || activePrice === null}
          className="flex items-center justify-center gap-1.5 bg-rose-600 px-3 py-2.5 font-silkscreen text-xs font-bold uppercase tracking-wider text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-white/30"
        >
          {executingSide === 'sell' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          <span>SELL</span>
        </button>

        <button
          type="button"
          onClick={() => void handleExecuteOrder('buy')}
          disabled={Boolean(viewAsUserId) || isSubmitting || activePrice === null}
          className="flex items-center justify-center gap-1.5 bg-emerald-600 px-3 py-2.5 font-silkscreen text-xs font-bold uppercase tracking-wider text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-white/30"
        >
          {executingSide === 'buy' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUpRight className="h-4 w-4" />
          )}
          <span>BUY</span>
        </button>
      </div>
    </div>
  );
};

export default OrderPanel;

