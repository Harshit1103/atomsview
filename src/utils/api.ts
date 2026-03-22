import { WeatherData, AirQualityHourly, AirQualityCurrent, HistoricalDailyWeather, Coordinates } from '../types';
import { format, isToday, isFuture, parseISO, subDays } from 'date-fns';

const BASE = 'https://api.open-meteo.com/v1';
const AIR  = 'https://air-quality-api.open-meteo.com/v1';

// ─── PERSISTENT CACHE (localStorage) ─────────────────────────────────────────
// Unlike the old in-memory Map, this survives page refresh → cache hit on return visit
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min for weather
const CACHE_PREFIX = 'atv2:';

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(CACHE_PREFIX + key); return null; }
    return data as T;
  } catch { return null; }
}

function lsSet(key: string, data: unknown) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

// ─── FETCH ────────────────────────────────────────────────────────────────────
async function apiFetch(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal, keepalive: true });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text().catch(() => '')).slice(0, 120)}`);
  return res.json();
}

// ─── WEATHER ─────────────────────────────────────────────────────────────────
export async function fetchWeatherData(
  coords: Coordinates, date: string, signal?: AbortSignal
): Promise<WeatherData> {
  const cacheKey = `wx:${coords.lat.toFixed(3)}:${coords.lon.toFixed(3)}:${date}`;
  const hit = lsGet<WeatherData>(cacheKey);
  if (hit) return hit;

  const dateObj = parseISO(date);
  const useForecast = isToday(dateObj) || isFuture(dateObj);

  const u = new URL(useForecast ? `${BASE}/forecast` : `${BASE}/archive`);
  u.searchParams.set('latitude',  String(coords.lat));
  u.searchParams.set('longitude', String(coords.lon));
  u.searchParams.set('timezone',  'auto');

  if (useForecast) {
    u.searchParams.set('current',       'temperature_2m,windspeed_10m,weathercode,relativehumidity_2m,precipitation,uv_index');
    u.searchParams.set('hourly',        'temperature_2m,relativehumidity_2m,precipitation,visibility,windspeed_10m,uv_index,precipitation_probability');
    u.searchParams.set('daily',         'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant,uv_index_max,precipitation_probability_max,sunrise,sunset');
    u.searchParams.set('forecast_days', '1');
    u.searchParams.set('past_days',     '0');
  } else {
    u.searchParams.set('hourly', 'temperature_2m,relativehumidity_2m,precipitation,visibility,windspeed_10m,direct_radiation');
    u.searchParams.set('daily',  'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset');
    u.searchParams.set('start_date', date);
    u.searchParams.set('end_date',   date);
  }

  const data = await apiFetch(u.toString(), signal);
  const times: string[] = data.hourly?.time ?? [];
  const noonIdx = times.findIndex(t => t.includes('T12:'));
  const safeIdx = noonIdx >= 0 ? noonIdx : Math.min(12, times.length - 1);

  const result: WeatherData = {
    current: {
      temperature: useForecast
        ? (data.current?.temperature_2m ?? data.hourly?.temperature_2m?.[safeIdx] ?? 0)
        : (data.hourly?.temperature_2m?.[safeIdx] ?? 0),
      windspeed: useForecast
        ? (data.current?.windspeed_10m ?? data.hourly?.windspeed_10m?.[safeIdx] ?? 0)
        : (data.hourly?.windspeed_10m?.[safeIdx] ?? 0),
      weathercode: useForecast ? (data.current?.weathercode ?? 0) : 0,
      time: useForecast ? (data.current?.time ?? date) : date,
    },
    daily: {
      time:                          data.daily?.time ?? [date],
      temperature_2m_max:            data.daily?.temperature_2m_max ?? [0],
      temperature_2m_min:            data.daily?.temperature_2m_min ?? [0],
      precipitation_sum:             data.daily?.precipitation_sum ?? [0],
      windspeed_10m_max:             data.daily?.windspeed_10m_max ?? [0],
      winddirection_10m_dominant:    data.daily?.winddirection_10m_dominant ?? [0],
      uv_index_max:                  data.daily?.uv_index_max ?? [0],
      precipitation_probability_max: data.daily?.precipitation_probability_max ?? [0],
      sunrise:                       data.daily?.sunrise ?? [''],
      sunset:                        data.daily?.sunset  ?? [''],
    },
    hourly: {
      time:                 times,
      temperature_2m:       data.hourly?.temperature_2m       ?? [],
      relativehumidity_2m:  data.hourly?.relativehumidity_2m  ?? [],
      precipitation:        data.hourly?.precipitation         ?? [],
      visibility:           data.hourly?.visibility            ?? [],
      windspeed_10m:        data.hourly?.windspeed_10m         ?? [],
      uv_index:             data.hourly?.uv_index ?? data.hourly?.direct_radiation ?? [],
      precipitation_probability: data.hourly?.precipitation_probability ?? [],
    },
  };

  lsSet(cacheKey, result);
  return result;
}

// ─── AIR QUALITY ─────────────────────────────────────────────────────────────
export async function fetchAirQuality(
  coords: Coordinates, date: string, signal?: AbortSignal
): Promise<{ hourly: AirQualityHourly; current: AirQualityCurrent }> {
  const cacheKey = `aq:${coords.lat.toFixed(3)}:${coords.lon.toFixed(3)}:${date}`;
  const hit = lsGet<{ hourly: AirQualityHourly; current: AirQualityCurrent }>(cacheKey);
  if (hit) return hit;

  const dateObj = parseISO(date);
  const u = new URL(`${AIR}/air-quality`);
  u.searchParams.set('latitude',  String(coords.lat));
  u.searchParams.set('longitude', String(coords.lon));
  u.searchParams.set('hourly',    'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,european_aqi');
  u.searchParams.set('timezone',  'auto');

  if (isToday(dateObj) || isFuture(dateObj)) {
    u.searchParams.set('forecast_days', '1');
  } else {
    u.searchParams.set('start_date', date);
    u.searchParams.set('end_date',   date);
  }

  const data = await apiFetch(u.toString(), signal);
  const times: string[] = data.hourly?.time ?? [];
  const nowH = new Date().getHours();
  const curIdx = isToday(dateObj)
    ? times.findIndex(t => t.includes(`T${String(nowH).padStart(2, '0')}:`))
    : times.findIndex(t => t.includes('T12:'));
  const si = curIdx >= 0 ? curIdx : Math.min(12, times.length - 1);

  const pm10H: number[] = data.hourly?.pm10  ?? [];
  const pm25H: number[] = data.hourly?.pm2_5 ?? [];
  const coH:   number[] = data.hourly?.carbon_monoxide  ?? [];
  const no2H:  number[] = data.hourly?.nitrogen_dioxide ?? [];
  const so2H:  number[] = data.hourly?.sulphur_dioxide  ?? [];
  const aqiH:  number[] = data.hourly?.european_aqi     ?? [];

  const result = {
    hourly:  { time: times, pm10: pm10H, pm2_5: pm25H, carbon_monoxide: coH, nitrogen_dioxide: no2H, sulphur_dioxide: so2H, european_aqi: aqiH },
    current: { pm10: pm10H[si] ?? 0, pm2_5: pm25H[si] ?? 0, carbon_monoxide: coH[si] ?? 0, nitrogen_dioxide: no2H[si] ?? 0, sulphur_dioxide: so2H[si] ?? 0, european_aqi: aqiH[si] ?? 0, carbon_dioxide: 421 },
  };

  lsSet(cacheKey, result);
  return result;
}

// ─── HISTORICAL ──────────────────────────────────────────────────────────────
export async function fetchHistoricalWeather(
  coords: Coordinates, startDate: string, endDate: string, signal?: AbortSignal
): Promise<HistoricalDailyWeather> {
  const safeEnd   = format(subDays(new Date(), 6), 'yyyy-MM-dd');
  const safeStart = format(subDays(new Date(), 2 * 365), 'yyyy-MM-dd');
  const fmtEnd   = endDate   > safeEnd   ? safeEnd   : endDate;
  const fmtStart = startDate < safeStart ? safeStart : startDate;
  if (fmtStart >= fmtEnd) throw new Error('End date must be at least 6 days before today (archive lag).');

  const cacheKey = `hist:${coords.lat.toFixed(3)}:${coords.lon.toFixed(3)}:${fmtStart}:${fmtEnd}`;
  const hit = lsGet<HistoricalDailyWeather>(cacheKey);
  if (hit) return hit;

  const wUrl = new URL(`${BASE}/archive`);
  wUrl.searchParams.set('latitude',   String(coords.lat));
  wUrl.searchParams.set('longitude',  String(coords.lon));
  wUrl.searchParams.set('start_date', fmtStart);
  wUrl.searchParams.set('end_date',   fmtEnd);
  wUrl.searchParams.set('daily',      'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant,sunrise,sunset');
  wUrl.searchParams.set('timezone',   'auto');

  const aqUrl = new URL(`${AIR}/air-quality`);
  aqUrl.searchParams.set('latitude',   String(coords.lat));
  aqUrl.searchParams.set('longitude',  String(coords.lon));
  aqUrl.searchParams.set('start_date', fmtStart);
  aqUrl.searchParams.set('end_date',   fmtEnd);
  aqUrl.searchParams.set('hourly',     'pm10,pm2_5');
  aqUrl.searchParams.set('timezone',   'auto');

  const [data, aqData] = await Promise.all([
    apiFetch(wUrl.toString(), signal),
    apiFetch(aqUrl.toString(), signal).catch(() => null),
  ]);

  let pm10Daily: number[] = [], pm25Daily: number[] = [];
  if (aqData) {
    const hourlyTimes: string[] = aqData.hourly?.time ?? [];
    const pm10H: number[] = aqData.hourly?.pm10  ?? [];
    const pm25H: number[] = aqData.hourly?.pm2_5 ?? [];
    const dailyDates: string[] = data.daily?.time ?? [];
    const dayMap: Record<string, number[]> = {};
    hourlyTimes.forEach((t, i) => { const d = t.slice(0, 10); (dayMap[d] = dayMap[d] ?? []).push(i); });
    dailyDates.forEach((day: string) => {
      const idxs = dayMap[day] ?? [];
      const avg = (arr: number[]) => { const v = idxs.map(i => arr[i]).filter(x => x != null && !isNaN(x)); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : 0; };
      pm10Daily.push(avg(pm10H));
      pm25Daily.push(avg(pm25H));
    });
  }

  const result: HistoricalDailyWeather = {
    time:                       data.daily?.time ?? [],
    temperature_2m_mean:        data.daily?.temperature_2m_mean ?? [],
    temperature_2m_max:         data.daily?.temperature_2m_max  ?? [],
    temperature_2m_min:         data.daily?.temperature_2m_min  ?? [],
    precipitation_sum:          data.daily?.precipitation_sum   ?? [],
    windspeed_10m_max:          data.daily?.windspeed_10m_max   ?? [],
    winddirection_10m_dominant: data.daily?.winddirection_10m_dominant ?? [],
    sunrise:                    data.daily?.sunrise ?? [],
    sunset:                     data.daily?.sunset  ?? [],
    pm10: pm10Daily,
    pm2_5: pm25Daily,
  };

  lsSet(cacheKey, result);
  return result;
}

// ─── GEOLOCATION — uses localStorage (not sessionStorage) so it persists ─────
const COORD_LS_KEY = 'atv2:gps-coords';
const CITY_LS_KEY  = 'atv2:gps-city';

export function loadStoredCoords(): Coordinates | null {
  try { const r = localStorage.getItem(COORD_LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function loadStoredCity(): string {
  try { return localStorage.getItem(CITY_LS_KEY) ?? ''; } catch { return ''; }
}
export function storeCoords(c: Coordinates) {
  try { localStorage.setItem(COORD_LS_KEY, JSON.stringify(c)); } catch {}
}
export function storeCity(name: string) {
  try { localStorage.setItem(CITY_LS_KEY, name); } catch {}
}

export function getGeolocation(): Promise<Coordinates> {
  const DEFAULT: Coordinates = { lat: 26.4499, lon: 80.3319 };
  if (!navigator.geolocation) return Promise.resolve(DEFAULT);
  return new Promise(resolve => {
    let done = false;
    // Short 500ms bail — if GPS takes longer, use stored coords (already set above)
    const bail = setTimeout(() => { if (!done) { done = true; resolve(DEFAULT); } }, 500);
    navigator.geolocation.getCurrentPosition(
      pos => { clearTimeout(bail); if (!done) { done = true; resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }); } },
      ()  => { clearTimeout(bail); if (!done) { done = true; resolve(DEFAULT); } },
      { timeout: 5000, maximumAge: 600_000, enableHighAccuracy: false }
    );
  });
}

export async function getCityName(coords: Coordinates): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`, { headers: { 'Accept-Language': 'en' } });
    const d = await res.json();
    return d.address?.city || d.address?.town || d.address?.county || d.address?.state || 'Your Location';
  } catch { return 'Your Location'; }
}

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
export function formatTemp(val: number, unit: 'celsius' | 'fahrenheit'): string {
  return unit === 'fahrenheit' ? `${Math.round(val * 9/5 + 32)}°F` : `${Math.round(val)}°C`;
}

export function getAQILevel(aqi: number): { label: string; color: string } {
  if (aqi <= 20)  return { label: 'Good',           color: '#22c55e' };
  if (aqi <= 40)  return { label: 'Fair',            color: '#84cc16' };
  if (aqi <= 60)  return { label: 'Moderate',        color: '#eab308' };
  if (aqi <= 80)  return { label: 'Poor',            color: '#f97316' };
  if (aqi <= 100) return { label: 'Very Poor',       color: '#ef4444' };
  return           { label: 'Extremely Poor',        color: '#a78bfa' };
}

export function getWeatherEmoji(code: number): string {
  if (code === 0)  return '☀️';  if (code <= 2)  return '⛅';  if (code === 3) return '☁️';
  if (code <= 49)  return '🌫️'; if (code <= 59)  return '🌦️'; if (code <= 69) return '🌧️';
  if (code <= 79)  return '❄️';  if (code <= 84)  return '🌦️'; if (code <= 99) return '⛈️';
  return '🌤️';
}

export function getWeatherDescription(code: number): string {
  const m: Record<number, string> = {
    0:'Clear Sky',1:'Mainly Clear',2:'Partly Cloudy',3:'Overcast',
    45:'Foggy',48:'Rime Fog',51:'Light Drizzle',53:'Drizzle',55:'Dense Drizzle',
    61:'Light Rain',63:'Moderate Rain',65:'Heavy Rain',
    71:'Light Snow',73:'Moderate Snow',75:'Heavy Snow',77:'Snow Grains',
    80:'Light Showers',81:'Showers',82:'Violent Showers',
    85:'Snow Showers',86:'Heavy Snow Showers',95:'Thunderstorm',
    96:'Thunderstorm + Hail',99:'Thunderstorm + Heavy Hail',
  };
  return m[code] ?? 'Unknown';
}

export function toIST(utcStr: string): string {
  if (!utcStr) return '--';
  try {
    const d = new Date(utcStr);
    d.setMinutes(d.getMinutes() + 330);
    const h = d.getUTCHours(), m = d.getUTCMinutes();
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  } catch { return '--'; }
}

export function windDirectionLabel(deg: number): string {
  return ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg / 45) % 8];
}

export async function searchCity(query: string): Promise<{ name: string; lat: number; lon: number }[]> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    return (data as any[]).map(r => ({
      name: [r.address?.city || r.address?.town || r.address?.village || r.address?.county || r.name, r.address?.state, r.address?.country_code?.toUpperCase()].filter(Boolean).join(', '),
      lat: parseFloat(r.lat), lon: parseFloat(r.lon),
    }));
  } catch { return []; }
}
