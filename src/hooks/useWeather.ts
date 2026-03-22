import { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinates, WeatherData, AirQualityHourly, AirQualityCurrent, TemperatureUnit } from '../types';
import { fetchWeatherData, fetchAirQuality, getGeolocation, getCityName, loadStoredCoords, loadStoredCity, storeCoords, storeCity } from '../utils/api';
import { format } from 'date-fns';

export interface WeatherState {
  coords: Coordinates | null;
  cityName: string;
  weatherData: WeatherData | null;
  airQualityHourly: AirQualityHourly | null;
  airQualityCurrent: AirQualityCurrent | null;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  tempUnit: TemperatureUnit;
  setTempUnit: (u: TemperatureUnit) => void;
  loading: boolean;
  aqLoading: boolean;
  error: string | null;
  refetch: () => void;
  setManualLocation: (coords: Coordinates, name: string) => void;
}

export function useWeather(): WeatherState {
  // Boot instantly from localStorage — APIs fire before GPS resolves
  const [coords, setCoords]         = useState<Coordinates | null>(loadStoredCoords);
  const [cityName, setCityName]     = useState<string>(loadStoredCity);
  const [weatherData, setWeather]   = useState<WeatherData | null>(null);
  const [airQualityHourly, setAQH]  = useState<AirQualityHourly | null>(null);
  const [airQualityCurrent, setAQC] = useState<AirQualityCurrent | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tempUnit, setTempUnit]     = useState<TemperatureUnit>('celsius');
  const [loading, setLoading]       = useState(true);
  const [aqLoading, setAQLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [trigger, setTrigger]       = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // GPS runs in the background — coords are already set from localStorage above
  // so APIs don't wait for this at all on repeat visits
  useEffect(() => {
    getGeolocation().then(c => {
      setCoords(prev => {
        // Only update if location meaningfully changed (> 1km)
        if (!prev || Math.abs(prev.lat - c.lat) > 0.01 || Math.abs(prev.lon - c.lon) > 0.01) {
          storeCoords(c); return c;
        }
        return prev;
      });
      // City name: fire and forget, never blocks render
      getCityName(c).then(name => { setCityName(name); storeCity(name); });
    });
  }, []);

  // Fetch — API responses are cached in localStorage so cache hits are instant
  useEffect(() => {
    if (!coords) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    setLoading(true);
    setError(null);

    // Both requests fire in true parallel — fetchWeatherData/fetchAirQuality
    // both check localStorage cache internally before hitting network
    const wxP = fetchWeatherData(coords, selectedDate, signal);
    const aqP  = fetchAirQuality(coords, selectedDate, signal);

    wxP.then(w => {
      if (signal.aborted) return;
      setWeather(w);
      setLoading(false); // unblock UI immediately, don't wait for AQ
    }).catch(err => {
      if (err.name === 'AbortError' || signal.aborted) return;
      setError(err.message);
      setLoading(false);
    });

    setAQLoading(true);
    aqP.then(aq => {
      if (!aq || signal.aborted) return;
      setAQH(aq.hourly);
      setAQC(aq.current);
    }).catch(() => {}).finally(() => { if (!signal.aborted) setAQLoading(false); });

    return () => abortRef.current?.abort();
  }, [coords, selectedDate, trigger]);

  const refetch = useCallback(() => setTrigger(t => t + 1), []);

  const setManualLocation = useCallback((newCoords: Coordinates, name: string) => {
    storeCoords(newCoords);
    storeCity(name);
    setCoords(newCoords);
    setCityName(name);
    setTrigger(t => t + 1);
  }, []);

  return {
    coords, cityName,
    weatherData, airQualityHourly, airQualityCurrent,
    selectedDate, setSelectedDate,
    tempUnit, setTempUnit,
    loading, aqLoading, error, refetch, setManualLocation,
  };
}
