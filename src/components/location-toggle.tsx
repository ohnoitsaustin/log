"use client";

import { useState, useEffect, useRef } from "react";
import { getLocation, fetchLocationName } from "@/lib/weather";

export function LocationToggle({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (location: string) => void;
  disabled?: boolean;
}) {
  const [fetched, setFetched] = useState<string | null>(value || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didFetch = useRef(false);

  const included = value !== "";

  // Auto-fetch location on mount
  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    // If we already have location data (e.g. editing an existing entry), use it
    if (value) {
      setFetched(value);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const coords = await getLocation();
        const loc = await fetchLocationName(coords.lat, coords.lon);
        setFetched(loc || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get location");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleToggle() {
    if (disabled || loading || !fetched) return;
    if (included) {
      onChange("");
    } else {
      onChange(fetched);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={included}
        onClick={handleToggle}
        disabled={disabled || loading || !fetched}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          included ? "bg-foreground" : "bg-foreground/20"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-sm ring-0 transition-transform duration-200 ${
            included ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>

      {loading && (
        <span className="text-foreground/40 text-xs">Fetching location...</span>
      )}

      {fetched && !loading && (
        <span className={`text-sm ${included ? "text-foreground/60" : "text-foreground/30"}`}>
          {fetched}
        </span>
      )}

      {error && !loading && (
        <span className="text-foreground/30 text-xs">{error}</span>
      )}
    </div>
  );
}
