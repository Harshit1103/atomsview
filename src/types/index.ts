export interface Coordinates {
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  temperature: number;
  windspeed: number;
  weathercode: number;
  time: string;
}

export interface DailyWeather {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  windspeed_10m_max: number[];
  winddirection_10m_dominant: number[];
  uv_index_max: number[];
  precipitation_probability_max: number[];
  sunrise: string[];
  sunset: string[];
}

export interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  relativehumidity_2m: number[];
  precipitation: number[];
  visibility: number[];
  windspeed_10m: number[];
  uv_index: number[];
  precipitation_probability: number[];
}

export interface AirQualityHourly {
  time: string[];
  pm10: number[];
  pm2_5: number[];
  carbon_monoxide: number[];
  nitrogen_dioxide: number[];
  sulphur_dioxide: number[];
  european_aqi: number[];
}

export interface AirQualityCurrent {
  pm10: number;
  pm2_5: number;
  carbon_monoxide: number;
  nitrogen_dioxide: number;
  sulphur_dioxide: number;
  european_aqi: number;
  // CO2 from GHG endpoint
  carbon_dioxide?: number;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyWeather;
  hourly: HourlyWeather;
}

export interface HistoricalDailyWeather {
  time: string[];
  temperature_2m_mean: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  windspeed_10m_max: number[];
  winddirection_10m_dominant: number[];
  sunrise: string[];
  sunset: string[];
  pm10?: number[];
  pm2_5?: number[];
}

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface ChartDataPoint {
  time: string;
  label: string;
  [key: string]: number | string;
}

export type Page = 'current' | 'historical';

export interface AQILevel {
  label: string;
  color: string;
  bg: string;
}
