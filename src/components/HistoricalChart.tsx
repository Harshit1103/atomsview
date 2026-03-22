import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  ComposedChart, Line, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceArea
} from 'recharts';

interface S { key: string; name: string; color: string; type: 'line' | 'bar' | 'area'; yAxisId?: string; }
interface Props { data: { label: string; [k: string]: any }[]; title: string; series: S[]; height?: number; }

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{
      padding: '12px 16px', minWidth: 150,
      boxShadow: '0 12px 40px rgba(0,0,0,.7)', pointerEvents: 'none',
      border: '1px solid rgba(139,92,246,.25)', background: 'rgba(15,10,30,.92)',
    }}>
      <p style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'IBM Plex Mono,monospace', letterSpacing: '.05em', marginBottom: 10 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--text-2)', flex: 1, fontFamily: 'IBM Plex Sans,sans-serif' }}>{p.name}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: 'Space Mono,monospace' }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function getYDomain(data: any[], keys: string[]): [number, number] {
  const vals = data.flatMap(d => keys.map(k => d[k] ?? 0)).filter(v => typeof v === 'number');
  if (!vals.length) return [0, 10];
  const min = Math.min(...vals), max = Math.max(...vals), range = max - min;
  if (range === 0) {
    const pad = max === 0 ? 1 : Math.abs(max) * 0.5;
    return [max - pad, max + pad];
  }
  const pad = range * 0.15;
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

let _histCounter = 0;

const HistoricalChartBase: React.FC<Props> = ({ data, title, series, height = 260 }) => {
  const idPrefix = useRef(`hst${++_histCounter}`).current;
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    setChartWidth(containerRef.current.offsetWidth);
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setChartWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const [refL, setRefL] = useState<string | null>(null);
  const [refR, setRefR] = useState<string | null>(null);
  const [sel, setSel] = useState(false);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const displayed = zoom ? data.slice(zoom[0], zoom[1] + 1) : data;

  const onDown = useCallback((e: any) => { if (e?.activeLabel) { setRefL(e.activeLabel); setSel(true); } }, []);
  const onMove = useCallback((e: any) => { if (sel && e?.activeLabel) setRefR(e.activeLabel); }, [sel]);
  const onUp = useCallback(() => {
    if (refL && refR && refL !== refR) {
      const il = data.findIndex(d => d.label === refL), ir = data.findIndex(d => d.label === refR);
      const [l, r] = il < ir ? [il, ir] : [ir, il];
      setZoom([l, r]);
    }
    setSel(false); setRefL(null); setRefR(null);
  }, [data, refL, refR]);

  const n = displayed.length;
  const ti = n > 365 ? 29 : n > 90 ? 6 : n > 30 ? 3 : 1;
  const minW = Math.max(n * (n > 100 ? 4.5 : 16), 450);
  const renderWidth = chartWidth > 0 ? Math.max(chartWidth, minW) : minW;
  const hasR = series.some(s => s.yAxisId === 'right');
  const tick = { fill: 'var(--text-3)', fontSize: 9, fontFamily: 'IBM Plex Mono,monospace' };
  const gradId = (key: string) => `${idPrefix}_${key}`;

  const leftKeys = series.filter(s => !s.yAxisId || s.yAxisId === 'left').map(s => s.key);
  const rightKeys = series.filter(s => s.yAxisId === 'right').map(s => s.key);
  const leftDomain = getYDomain(displayed, leftKeys);
  const rightDomain = getYDomain(displayed, rightKeys);

  if (chartWidth === 0) {
    return (
      <div className="card chart-card fade-up">
        <div className="chart-header">
          <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--text-1)', letterSpacing: '.05em' }}>{title}</span>
        </div>
        <div ref={containerRef} style={{ height, background: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="card chart-card fade-up">
      <div className="chart-header">
        <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: 'var(--text-1)', letterSpacing: '.05em' }}>{title}</span>
        {zoom
          ? <button className="reset-zoom-btn" onClick={() => setZoom(null)}>↺ Reset Zoom</button>
          : <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'IBM Plex Mono,monospace', letterSpacing: '.05em' }}>drag to zoom</span>
        }
      </div>
      <div className="chart-scroll" ref={containerRef}>
        <div style={{ minWidth: minW, height, overflow: 'hidden' }}>
          <ComposedChart
            data={displayed}
            width={renderWidth} height={height}
            margin={{ top: 8, right: hasR ? 38 : 8, left: -24, bottom: 0 }}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
          >
            <defs>
              {series.filter(s => s.type === 'area').map(s => (
                <linearGradient key={s.key} id={gradId(s.key)} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="2 6" vertical={false} />
            <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} interval={ti} dy={6} />
            <YAxis yAxisId="left"  tick={tick} axisLine={false} tickLine={false} width={32} domain={leftDomain} />
            {hasR && <YAxis yAxisId="right" orientation="right" tick={tick} axisLine={false} tickLine={false} width={32} domain={rightDomain} />}
            <Tooltip content={<Tip />} wrapperStyle={{ zIndex: 50 }} />
            <Legend iconType="circle" iconSize={5} wrapperStyle={{ fontSize: 10, color: 'var(--text-2)', paddingTop: 8, fontFamily: 'IBM Plex Mono,monospace' }} />
            {sel && refL && refR && (
              <ReferenceArea yAxisId="left" x1={refL} x2={refR} fill="rgba(139,92,246,.07)" stroke="rgba(139,92,246,.2)" />
            )}
            {series.map(s => {
              const y = s.yAxisId ?? 'left';
              if (s.type === 'bar') return (
                <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} yAxisId={y} radius={[2, 2, 0, 0]} maxBarSize={10} fillOpacity={0.75} minPointSize={2} />
              );
              if (s.type === 'area') return (
                <Area key={s.key} type="monotone" dataKey={s.key} name={s.name}
                  stroke={s.color} fill={`url(#${gradId(s.key)})`}
                  dot={false} strokeWidth={2} strokeLinecap="round"
                  yAxisId={y} activeDot={{ r: 3, strokeWidth: 0 }} />
              );
              return (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.name}
                  stroke={s.color} dot={false} strokeWidth={2} strokeLinecap="round"
                  yAxisId={y} activeDot={{ r: 3, strokeWidth: 0 }} />
              );
            })}
          </ComposedChart>
        </div>
      </div>
    </div>
  );
};

export const HistoricalChart = memo(HistoricalChartBase);
