import { formatInTimeZone } from 'date-fns-tz';

export interface MarketStatus {
  marketOpen: boolean;
  pipelineRanToday: boolean;
  dataIsStale: boolean;
  isWeekday: boolean;
}

export function useMarketStatus(lastPipelineRun?: string | null): MarketStatus {
  const now = new Date();
  const ist = 'Asia/Kolkata';
  const istTime = formatInTimeZone(now, ist, 'HH:mm');
  const istDate = formatInTimeZone(now, ist, 'yyyy-MM-dd');
  const dayOfWeek = now.getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  const marketOpen = isWeekday && istTime >= '09:15' && istTime < '15:30';

  const pipelineRanToday =
    lastPipelineRun != null
      ? formatInTimeZone(new Date(lastPipelineRun), ist, 'yyyy-MM-dd') === istDate
      : false;

  const dataIsStale = isWeekday && istTime >= '17:00' && !pipelineRanToday;

  return { marketOpen, pipelineRanToday, dataIsStale, isWeekday };
}
