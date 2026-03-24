import { useEffect, useMemo, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import type { Candle } from '../../types';
import { cn } from '@/lib/utils';
import { toNum } from '../../utils/format';

function toDateStr(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw);
  if (s.length >= 10 && s[4] === '-' && s[7] === '-') return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '1970-01-01' : d.toISOString().slice(0, 10);
}

interface VolumeChartProps {
  candles: Candle[];
  height?: number;
}

export function VolumeChart({ candles, height = 120 }: VolumeChartProps) {
  const chart_ref = useRef<HTMLDivElement>(null);
  const chart_instance = useRef<IChartApi | null>(null);

  const volume_data = useMemo(
    () =>
      candles.slice(-500).map((c) => ({
        time: toDateStr(c.date),
        value: toNum(c.volume) ?? 0,
        color: (toNum(c.close) ?? 0) >= (toNum(c.open) ?? 0) ? '#22c55e80' : '#ef444480',
      })),
    [candles],
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

    const histogram_series = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    histogram_series.setData(volume_data);

    chart.timeScale().fitContent();

    return () => {
      chart.remove();
      chart_instance.current = null;
    };
  }, [height, volume_data]);

  return (
    <div
      ref={chart_ref}
      className={cn('w-full rounded-lg overflow-hidden')}
      style={{ height }}
    />
  );
}
