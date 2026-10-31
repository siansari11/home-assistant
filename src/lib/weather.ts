import type { WeatherReport } from '../types';

export const WEATHER_PLACE = {
  name: 'Seddiner See',
  latitude: 52.28,
  longitude: 13.02,
  timeZone: 'Europe/Berlin',
};

const WEATHER_KEY = 'our-home.weather.v1';
const FRESH_MS = 20 * 60 * 1000;

const endpoint = new URL('https://api.open-meteo.com/v1/forecast');
endpoint.search = new URLSearchParams({
  latitude: String(WEATHER_PLACE.latitude),
  longitude: String(WEATHER_PLACE.longitude),
  current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
  daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  timezone: WEATHER_PLACE.timeZone,
  forecast_days: '5',
  temperature_unit: 'celsius',
  wind_speed_unit: 'kmh',
}).toString();

export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Weather';
}

export function readWeatherCache(): WeatherReport | null {
  try {
    const raw = localStorage.getItem(WEATHER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherReport;
    if (!parsed?.now || !Array.isArray(parsed.days)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function loadWeather(force = false): Promise<WeatherReport> {
  const cached = readWeatherCache();
  if (!force && cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached;
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Weather responded ${response.status}`);
  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number;
      apparent_temperature?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
    daily?: {
      time?: string[];
      weather_code?: number[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: Array<number | null>;
    };
  };
  const report: WeatherReport = {
    fetchedAt: Date.now(),
    now: {
      temperature: Math.round(data.current?.temperature_2m ?? 0),
      apparent: Math.round(data.current?.apparent_temperature ?? 0),
      code: Number(data.current?.weather_code ?? 0),
      wind: Math.round(data.current?.wind_speed_10m ?? 0),
      humidity: Math.round(data.current?.relative_humidity_2m ?? 0),
    },
    days: (data.daily?.time ?? []).map((date, index) => ({
      date,
      code: Number(data.daily?.weather_code?.[index] ?? 0),
      high: Math.round(data.daily?.temperature_2m_max?.[index] ?? 0),
      low: Math.round(data.daily?.temperature_2m_min?.[index] ?? 0),
      rain:
        data.daily?.precipitation_probability_max?.[index] == null
          ? null
          : Math.round(Number(data.daily?.precipitation_probability_max?.[index])),
    })),
  };
  localStorage.setItem(WEATHER_KEY, JSON.stringify(report));
  return report;
}
