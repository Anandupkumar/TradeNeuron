import { useEffect, useMemo, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import type { CandleWithIndicators } from '../../types';
import { cn } from '@/lib/utils';

interface CandlestickChartProps {
  candles: CandleWithIndicators[];
  height?: number;
}

export function CandlestickChart({ candles, height = 400 }: CandlestickChartProps) {
  const chart_ref = useRef<HTMLDivElement>(null);
  const chart_instance = useRef<IChartApi | null>(null);

  const capped_candles = useMemo(
    () => candles.slice(-500),
    [candles],
  );

  const candlestick_data = useMemo(
    () =>
      capped_candles.map((c) => ({
        time: c.date as string,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.adjusted_close,
      })),
    [capped_candles],
  );

  const ema_20_data = useMemo(
    () =>
      capped_candles
        .filter((c) => c.indicators?.ema_20 != null)
        .map((c) => ({ time: c.date as string, value: c.indicators!.ema_20! })),
    [capped_candles],
  );

  const ema_50_data = useMemo(
    () =>
      capped_candles
        .filter((c) => c.indicators?.ema_50 != null)
        .map((c) => ({ time: c.date as string, value: c.indicators!.ema_50! })),
    [capped_candles],
  );

  const ema_200_data = useMemo(
    () =>
      capped_candles
        .filter((c) => c.indicators?.ema_200 != null)
        .map((c) => ({ time: c.date as string, value: c.indicators!.ema_200! })),
    [capped_candles],
  );

  useEffect(() => {
    if (!chart_ref.current) return;

    const chart = createChart(chart_ref.current, {
      width: chart_ref.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: '#27272a' },
        horzLines: { color: '#27272a' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#27272a' },
      timeScale: { borderColor: '#27272a' },
      autoSize: true,
    });

    chart_instance.current = chart;

    const candle_series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candle_series.setData(candlestick_data);

    if (ema_20_data.length > 0) {
      const ema_20_series = chart.addLineSeries({
        color: '#06b6d4',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema_20_series.setData(ema_20_data);
    }

    if (ema_50_data.length > 0) {
      const ema_50_series = chart.addLineSeries({
        color: '#eab308',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema_50_series.setData(ema_50_data);
    }

    if (ema_200_data.length > 0) {
      const ema_200_series = chart.addLineSeries({
        color: '#a855f7',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema_200_series.setData(ema_200_data);
    }

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chart_instance.current = null;
    };
  }, [height, candlestick_data, ema_20_data, ema_50_data, ema_200_data]);

  return (
    <div
      ref={chart_ref}
      className={cn('w-full rounded-lg overflow-hidden')}
      style={{ height }}
    />
  );
}
