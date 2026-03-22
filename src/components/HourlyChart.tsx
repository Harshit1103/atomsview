import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, Legend
} from 'recharts';

interface DataKey { key: string; color: string; name: string; }
interface Props {
  data: { label: string; [k: string]: any }[];
  title: string;
  titleIcon?: string;
  dataKeys: DataKey[];
  type?: 'area' | 'bar' | 'line';
  height?: number;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{
      padding: '12px 16px', minWidth: 140,
      boxShadow: '0 12px 40px rgba(0,0,0,.7)', pointerEvents: 'none',
      border: '1px solid rgba(139,92,246,.25)',
      background: 'rgba(15,10,30,.92)',
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

const tick = { fill: 'var(--text-3)', fontSize: 9, fontFamily: 'IBM Plex Mono,monospace' };
let _chartCounter = 0;

// Compute a good Y domain that always leaves breathing room
// Handles the flat-line case (all values identical) that breaks auto domain
function getYDomain(data: any[], keys: string[]): [number, number] {
  const vals = data.flatMap(d => keys.map(k => d[k] ?? 0)).filter(v => typeof v === 'number');
  if (!vals.length) return [0, 10];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min;
  // If all values are the same (flat line), create artificial range
  if (range === 0) {
    const pad = max === 0 ? 1 : Math.abs(max) * 0.5;
    return [max - pad, max + pad];
  }
  const pad = range * 0.15;
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

const HourlyChartBase: React.FC<Props> = ({ data, title, titleIcon, dataKeys, type = 'area', height = 210 }) => {
  const idPrefix = useRef(`hc${++_chartCounter}`).current;
  // FIX: track actual container width so chart renders correctly on first paint
  // This solves the "blank until hover" bug caused by ResponsiveContainer 0x0 initial render
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    // Set initial width immediately
    setChartWidth(containerRef.current.offsetWidth);
    // Watch for resize
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

  const minW = Math.max(displayed.length * 38, 420);
  // Use measured width so chart fills container on first render — no hover needed
  const renderWidth = chartWidth > 0 ? Math.max(chartWidth, minW) : minW;

  const yDomain = getYDomain(displayed, dataKeys.map(d => d.key));

  const common = {
    data: displayed,
    onMouseDown: onDown, onMouseMove: onMove, onMouseUp: onUp,
    margin: { top: 8, right: 8, left: -24, bottom: 0 },
    width: renderWidth,
    height,
  };

  const gradId = (key: string) => `${idPrefix}_${key}`;

  const defs = (
    <defs>
      {dataKeys.map(dk => (
        <linearGradient key={dk.key} id={gradId(dk.key)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={dk.color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={dk.color} stopOpacity={0.01} />
        </linearGradient>
      ))}
    </defs>
  );

  const axes = (
    <>
      <CartesianGrid strokeDasharray="2 6" vertical={false} />
      <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} interval={3} dy={6} />
      <YAxis tick={tick} axisLine={false} tickLine={false} width={32} domain={yDomain} />
      <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 50 }} />
      {dataKeys.length > 1 && (
        <Legend iconType="circle" iconSize={5} wrapperStyle={{ fontSize: 10, color: 'var(--text-2)', paddingTop: 8, fontFamily: 'IBM Plex Mono,monospace' }} />
      )}
      {sel && refL && refR && (
        <ReferenceArea x1={refL} x2={refR} fill="rgba(139,92,246,.07)" stroke="rgba(139,92,246,.2)" />
      )}
    </>
  );

  // Don't render chart until we know the width — prevents 0x0 blank render
  if (chartWidth === 0) {
    return (
      <div className="card chart-card fade-up">
        <div className="chart-header">
          <div className="chart-title">
            {titleIcon && <span style={{ fontSize: 14 }}>{titleIcon}</span>}
            <span>{title}</span>
          </div>
        </div>
        <div ref={containerRef} style={{ height, background: 'transparent' }} />
      </div>
    );
  }

  const chart = type === 'bar' ? (
    <BarChart {...common}>
      {axes}
      {dataKeys.map(dk => (
        <Bar key={dk.key} dataKey={dk.key} name={dk.name} fill={dk.color}
          radius={[3, 3, 0, 0]} maxBarSize={14} fillOpacity={0.8} minPointSize={2} />
      ))}
    </BarChart>
  ) : type === 'line' ? (
    <LineChart {...common}>
      {axes}
      {dataKeys.map(dk => (
        <Line key={dk.key} type="monotone" dataKey={dk.key} name={dk.name}
          stroke={dk.color} dot={false} strokeWidth={2} strokeLinecap="round"
          activeDot={{ r: 4, strokeWidth: 0, fill: dk.color }} />
      ))}
    </LineChart>
  ) : (
    <AreaChart {...common}>
      {defs}{axes}
      {dataKeys.map(dk => (
        <Area key={dk.key} type="monotone" dataKey={dk.key} name={dk.name}
          stroke={dk.color} fill={`url(#${gradId(dk.key)})`}
          dot={false} strokeWidth={2} strokeLinecap="round"
          activeDot={{ r: 4, strokeWidth: 0 }} />
      ))}
    </AreaChart>
  );

  return (
    <div className="card chart-card fade-up">
      <div className="chart-header">
        <div className="chart-title">
          {titleIcon && <span style={{ fontSize: 14 }}>{titleIcon}</span>}
          <span>{title}</span>
        </div>
        {zoom
          ? <button className="reset-zoom-btn" onClick={() => setZoom(null)}>↺ Reset Zoom</button>
          : <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'IBM Plex Mono,monospace', letterSpacing: '.05em' }}>drag to zoom</span>
        }
      </div>
      {/* overflow-x auto for horizontal scroll, ref for width measurement */}
      <div className="chart-scroll" ref={containerRef}>
        <div style={{ minWidth: minW, height, overflow: 'hidden' }}>
          {chart}
        </div>
      </div>
    </div>
  );
};

export const HourlyChart = memo(HourlyChartBase);
