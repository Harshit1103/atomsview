import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react';
import { searchCity } from '../utils/api';
import { Coordinates } from '../types';

interface Result { name: string; lat: number; lon: number; }

interface Props {
  cityName: string;
  loading: boolean;
  onSelect: (coords: Coordinates, name: string) => void;
  onGPS: () => void;
}

export const LocationPicker: React.FC<Props> = ({ cityName, loading, onSelect, onGPS }) => {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused]   = useState(-1);
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); setResults([]); setFocused(-1); }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Debounced search
  const handleInput = useCallback((val: string) => {
    setQuery(val); setFocused(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!val.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchCity(val);
      setResults(res); setSearching(false);
    }, 320);
  }, []);

  const pick = (r: Result) => {
    onSelect({ lat: r.lat, lon: r.lon }, r.name);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, -1)); }
    if (e.key === 'Enter' && focused >= 0) pick(results[focused]);
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* ── Chip trigger ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Change location"
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: open ? 'var(--violet-light)' : 'var(--text-2)',
          background: open ? 'rgba(139,92,246,.14)' : 'rgba(139,92,246,.07)',
          border: `1px solid ${open ? 'rgba(139,92,246,.4)' : 'rgba(139,92,246,.18)'}`,
          padding: '5px 11px', borderRadius: 99,
          fontFamily: 'IBM Plex Mono, monospace',
          cursor: 'pointer', transition: 'all .18s ease',
          maxWidth: 180, overflow: 'hidden',
          boxShadow: open ? '0 0 16px rgba(139,92,246,.2)' : 'none',
        }}
      >
        {loading && !cityName
          ? <><Loader2 size={10} style={{ animation: 'bspin .75s linear infinite', color: 'var(--violet-light)', flexShrink: 0 }} /><span>Locating…</span></>
          : <>
              <MapPin size={10} style={{ color: 'var(--violet-light)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cityName || '—'}
              </span>
              <Search size={9} style={{ opacity: .5, flexShrink: 0, marginLeft: 2 }} />
            </>
        }
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 300, zIndex: 999,
          background: 'rgba(15,10,30,.97)',
          border: '1px solid rgba(139,92,246,.3)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,.7), 0 0 0 1px rgba(139,92,246,.1)',
          backdropFilter: 'blur(32px)',
          overflow: 'hidden',
          animation: 'dropIn .18s cubic-bezier(.22,1,.36,1)',
        }}>
          <style>{`@keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid rgba(139,92,246,.12)' }}>
            <Search size={13} style={{ color: 'var(--violet-light)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search city, town or place…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text-1)', fontSize: 13,
                fontFamily: 'IBM Plex Sans, sans-serif',
              }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                <X size={12} />
              </button>
            )}
            {searching && <Loader2 size={12} style={{ color: 'var(--violet-light)', animation: 'bspin .75s linear infinite', flexShrink: 0 }} />}
          </div>

          {/* GPS option */}
          <button
            onClick={() => { onGPS(); setOpen(false); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', background: 'none', border: 'none',
              borderBottom: '1px solid rgba(139,92,246,.08)',
              color: 'var(--violet-light)', cursor: 'pointer', textAlign: 'left',
              fontSize: 12, fontFamily: 'IBM Plex Mono, monospace',
              transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Navigation size={13} />
            Use my GPS location
          </button>

          {/* Results */}
          {results.length > 0 && (
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => pick(r)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', background: focused === i ? 'rgba(139,92,246,.15)' : 'none',
                    border: 'none', borderBottom: '1px solid rgba(139,92,246,.06)',
                    color: focused === i ? 'var(--text-1)' : 'var(--text-2)',
                    cursor: 'pointer', textAlign: 'left', transition: 'background .12s',
                  }}
                  onMouseEnter={e => { setFocused(i); (e.currentTarget.style.background = 'rgba(139,92,246,.1)'); }}
                  onMouseLeave={e => { (e.currentTarget.style.background = focused === i ? 'rgba(139,92,246,.15)' : 'none'); }}
                >
                  <MapPin size={11} style={{ color: 'var(--violet-light)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontFamily: 'IBM Plex Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {query.length > 1 && !searching && results.length === 0 && (
            <div style={{ padding: '20px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)', fontFamily: 'IBM Plex Mono, monospace' }}>
              No results for "{query}"
            </div>
          )}

          {!query && (
            <div style={{ padding: '14px', fontSize: 11, color: 'var(--text-3)', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center' }}>
              Type a city name to search
            </div>
          )}
        </div>
      )}
    </div>
  );
};
