import { useState, useEffect, useRef } from 'react';
import { Coordinates, HistoricalDailyWeather } from '../types';
import { fetchHistoricalWeather } from '../utils/api';
import { format, subDays } from 'date-fns';

// Open-Meteo archive has a ~5-day lag — safe max end date
export const ARCHIVE_MAX_END = format(subDays(new Date(), 6), 'yyyy-MM-dd');
export const ARCHIVE_MIN_START = format(subDays(new Date(), 2 * 365), 'yyyy-MM-dd');

interface UseHistoricalReturn {
  data: HistoricalDailyWeather | null;
  startDate: string;
  endDate: string;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
  loading: boolean;
  error: string | null;
}

export function useHistorical(coords: Coordinates | null): UseHistoricalReturn {
  const [data, setData] = useState<HistoricalDailyWeather | null>(null);
  // Default: last 30 days — safely before the archive lag window
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 36), 'yyyy-MM-dd'));
  const [endDate, setEndDate]     = useState(ARCHIVE_MAX_END);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!coords) return;
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    fetchHistoricalWeather(coords, startDate, endDate, abortRef.current.signal)
      .then(d => { setData(d); setError(null); })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => abortRef.current?.abort();
  }, [coords, startDate, endDate]);

  return { data, startDate, endDate, setStartDate, setEndDate, loading, error };
}
