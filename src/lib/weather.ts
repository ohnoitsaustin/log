export interface WeatherData {
  high: number;
  low: number;
  emoji: string;
  description: string;
}

const WEATHER_CACHE_KEY = "weather_cache";
const WEATHER_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

interface WeatherCache {
  data: WeatherData;
  timestamp: number;
}

function getCachedWeather(): WeatherData | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const cache: WeatherCache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > WEATHER_CACHE_TTL) {
      localStorage.removeItem(WEATHER_CACHE_KEY);
      return null;
    }
    return cache.data;
  } catch {
    return null;
  }
}

function setCachedWeather(data: WeatherData) {
  try {
    const cache: WeatherCache = { data, timestamp: Date.now() };
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const cached = getCachedWeather();
  if (cached) return cached;

  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to fetch weather");
  }
  const data: WeatherData = await res.json();
  setCachedWeather(data);
  return data;
}

export function getLocation(): Promise<{ lat: number; lon: number }> {
  // Check sessionStorage cache first
  const cached = sessionStorage.getItem("geo_coords");
  if (cached) {
    try {
      return Promise.resolve(JSON.parse(cached));
    } catch {
      // Ignore invalid cache
    }
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        sessionStorage.setItem("geo_coords", JSON.stringify(coords));
        resolve(coords);
      },
      (error) => {
        reject(new Error(error.message || "Failed to get location"));
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  });
}

export function formatWeather(w: WeatherData): string {
  return `${w.emoji} ${w.low}°/${w.high}°`;
}
