import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;

function conditionToEmoji(id: number): string {
  if (id >= 200 && id < 300) return "⛈️";  // Thunderstorm
  if (id >= 300 && id < 400) return "🌦️";  // Drizzle
  if (id >= 500 && id < 600) return "🌧️";  // Rain
  if (id >= 600 && id < 700) return "❄️";   // Snow
  if (id >= 700 && id < 800) return "🌫️";  // Atmosphere (fog, mist, haze)
  if (id === 800) return "☀️";              // Clear
  if (id === 801) return "🌤️";             // Few clouds
  if (id === 802) return "⛅";              // Scattered clouds
  if (id >= 803) return "☁️";              // Overcast
  return "🌡️";
}

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Weather API not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "lat and lon are required" },
      { status: 400 },
    );
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=imperial&appid=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error("OpenWeatherMap error:", res.status, text);
    return NextResponse.json(
      { error: "Failed to fetch weather", detail: text },
      { status: 502 },
    );
  }

  const data = await res.json();

  return NextResponse.json({
    high: Math.round(data.main.temp_max),
    low: Math.round(data.main.temp_min),
    emoji: conditionToEmoji(data.weather[0].id),
    description: data.weather[0].description,
  });
}
