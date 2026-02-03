export interface WeatherData {
  high: number;
  low: number;
  emoji: string;
  description: string;
}

export interface ContextData {
  weather: WeatherData;
  location: string;
}

const CONTEXT_CACHE_KEY = "context_cache";
const CONTEXT_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

interface ContextCache {
  data: ContextData;
  timestamp: number;
}

function getCachedContext(): ContextData | null {
  try {
    const raw = localStorage.getItem(CONTEXT_CACHE_KEY);
    if (!raw) return null;
    const cache: ContextCache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CONTEXT_CACHE_TTL) {
      localStorage.removeItem(CONTEXT_CACHE_KEY);
      return null;
    }
    return cache.data;
  } catch {
    return null;
  }
}

function setCachedContext(data: ContextData) {
  try {
    const cache: ContextCache = { data, timestamp: Date.now() };
    localStorage.setItem(CONTEXT_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

export async function fetchContext(lat: number, lon: number): Promise<ContextData> {
  const cached = getCachedContext();
  if (cached) return cached;

  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to fetch weather");
  }
  const raw = await res.json();
  const data: ContextData = {
    weather: {
      high: raw.high,
      low: raw.low,
      emoji: raw.emoji,
      description: raw.description,
    },
    location: raw.location || "",
  };
  setCachedContext(data);
  return data;
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const ctx = await fetchContext(lat, lon);
  return ctx.weather;
}

export async function fetchLocationName(lat: number, lon: number): Promise<string> {
  const ctx = await fetchContext(lat, lon);
  return ctx.location;
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
