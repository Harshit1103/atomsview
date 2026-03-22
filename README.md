# 🌤 AtmosView — Weather Dashboard

A responsive weather dashboard built with **React + Vite + TypeScript + Tailwind CSS**, powered by the [Open-Meteo API](https://open-meteo.com).

## Live Demo
> Deploy to Vercel / Netlify after cloning (see below).

---

## Features

### Page 1 — Current Weather & Hourly Forecast
- 📍 **Auto GPS detection** via browser `navigator.geolocation`
- 📅 **Date picker** to view any date within the last 15 days
- 🌡 **Temperature** — Current, Min, Max with °C / °F toggle
- 🌫 **Atmospheric** — Precipitation, Relative Humidity, UV Index
- ☀️ **Sun Cycle** — Sunrise & Sunset (displayed in IST)
- 💨 **Wind & Air** — Max Wind Speed, Precipitation Probability Max
- 🌿 **Air Quality** — AQI (European), PM10, PM2.5, CO, CO₂, NO₂, SO₂
- 📈 **Hourly Charts** with zoom & horizontal scroll:
  - Temperature (with °C/°F toggle)
  - Relative Humidity
  - Precipitation
  - Visibility
  - Wind Speed (10m)
  - PM10 & PM2.5 (combined)

### Page 2 — Historical Analysis (up to 2 years)
- 📆 **Date range picker** with automatic 2-year cap enforcement
- 📊 Charts for:
  - Temperature — Mean, Max, Min
  - Sun Cycle — Sunrise & Sunset (IST, plotted as minutes from midnight)
  - Precipitation total
  - Max Wind Speed
  - Air Quality — PM10 & PM2.5 daily average trends

### Chart Interactions
- 🔍 **Zoom** — click and drag on any chart to zoom into a time range; "Reset Zoom" button to return
- ↔️ **Horizontal scroll** — all charts scroll on mobile / dense datasets
- 📱 **Mobile-responsive** — all layouts adapt to small screens

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Vite | Build tool (fast HMR) |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| Recharts | Chart library |
| date-fns | Date manipulation |
| lucide-react | Icon set |
| Open-Meteo API | Weather & air quality data |
| Nominatim (OSM) | Reverse geocoding (city name) |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/weather-dashboard.git
cd weather-dashboard
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
npm run preview
```

---

## Deployment

### Vercel (recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# Drag & drop the `dist/` folder to netlify.com/drop
```

---

## Project Structure

```
src/
├── components/
│   ├── StatCard.tsx         # Individual metric card
│   ├── HourlyChart.tsx      # Hourly charts with zoom
│   ├── HistoricalChart.tsx  # Historical charts (composed)
│   └── LoadingSpinner.tsx   # Skeleton loaders
├── hooks/
│   ├── useWeather.ts        # Current weather state & fetching
│   └── useHistorical.ts     # Historical data state & fetching
├── pages/
│   ├── CurrentWeatherPage.tsx
│   └── HistoricalPage.tsx
├── types/
│   └── index.ts             # All TypeScript interfaces
├── utils/
│   └── api.ts               # API calls, formatters, helpers
├── App.tsx                  # Root component + navigation
├── main.tsx
└── index.css                # Tailwind + global styles
```

---

## API Usage

| Endpoint | Purpose |
|----------|---------|
| `https://api.open-meteo.com/v1/forecast` | Current + hourly weather |
| `https://air-quality-api.open-meteo.com/v1/air-quality` | AQI, PM10, PM2.5, CO, NO₂, SO₂ |
| `https://api.open-meteo.com/v1/archive` | Historical daily weather |
| `https://nominatim.openstreetmap.org/reverse` | City name from GPS coords |

All APIs are **free and require no API key**.

---

## Performance Notes

- Data is fetched in parallel (`Promise.all`) to minimize load time
- Geolocation uses `maximumAge: 600000` to cache GPS position for 10 minutes
- Charts render with `<ResponsiveContainer>` for efficient layout
- Fallback coordinates (New Delhi) if GPS is denied
- Skeleton loading states shown immediately while data loads

---

## License
MIT
