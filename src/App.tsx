import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CloudSun, BarChart2, WifiOff, Sun, Moon } from 'lucide-react';
import { CurrentWeatherPage } from './pages/CurrentWeatherPage';
import { HistoricalPage } from './pages/HistoricalPage';
import { LocationPicker } from './components/LocationPicker';
import { useWeather, WeatherState } from './hooks/useWeather';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { getGeolocation, getCityName } from './utils/api';
import { Coordinates } from './types';
import { Page } from './types';

export const WeatherContext = createContext<WeatherState | null>(null);
export const useWeatherCtx = () => {
  const ctx = useContext(WeatherContext);
  if (!ctx) throw new Error('No WeatherContext');
  return ctx;
};

function AppInner({ onMount }: { onMount?: () => void }) {
  const [page, setPage] = useState<Page>('current');
  const [online, setOnline] = useState(navigator.onLine);
  const weatherState = useWeather();
  const { theme, toggleTheme } = useTheme();
  const { coords, cityName, loading, setManualLocation } = weatherState;

  useEffect(() => { onMount?.(); }, []);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Re-trigger GPS fetch
  const handleGPS = useCallback(() => {
    getGeolocation().then(c => {
      getCityName(c).then(name => setManualLocation(c, name));
    });
  }, [setManualLocation]);

  return (
    <WeatherContext.Provider value={weatherState}>
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

        {/* ── HEADER ── */}
        <header className="app-header">
          <div className="header-inner">

            {/* Logo */}
            <div className="logo">
              <div className="logo-mark">
                <CloudSun size={19} color="#fff" strokeWidth={2} />
              </div>
              <span className="logo-text">Atmos<em>View</em></span>
            </div>

            {/* Nav — center */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div className="nav-pill">
                <button className={`nav-btn${page === 'current' ? ' active' : ''}`} onClick={() => setPage('current')}>
                  <CloudSun size={13} /> <span>Current</span>
                </button>
                <button className={`nav-btn${page === 'historical' ? ' active' : ''}`} onClick={() => setPage('historical')}>
                  <BarChart2 size={13} /> <span>Historical</span>
                </button>
              </div>
            </div>

            {/* Right — location picker + theme toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {!online && (
                <span className="offline-badge"><WifiOff size={10} /> Offline</span>
              )}

              {/* ← Clickable location picker */}
              <LocationPicker
                cityName={cityName}
                loading={loading}
                onSelect={(c: Coordinates, name: string) => setManualLocation(c, name)}
                onGPS={handleGPS}
              />

              <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
                {theme === 'dark'
                  ? <Sun size={15} style={{ color: '#fde68a' }} />
                  : <Moon size={15} style={{ color: 'var(--violet-light)' }} />
                }
              </button>
            </div>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main className="page-wrap">
          {page === 'current' ? <CurrentWeatherPage /> : <HistoricalPage coords={coords} />}
        </main>

        {/* ── FOOTER ── */}
        <footer className="app-footer">
          <div className="footer-inner">
            <span>
              Powered by <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo API</a>
              {' '}· Air quality via Open-Meteo AQ · Geocoding via OpenStreetMap
            </span>
            <span>AtmosView v2.3.0</span>
          </div>
        </footer>
      </div>
    </WeatherContext.Provider>
  );
}

export default function App({ onMount }: { onMount?: () => void }) {
  return <ThemeProvider><AppInner onMount={onMount} /></ThemeProvider>;
}
