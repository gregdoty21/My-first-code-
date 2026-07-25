// Weather lookups via Open-Meteo — free, no API key required.
// Trips within the ~16-day forecast window get a real forecast; trips further
// out get "typical" weather estimated from last year's archive for the same dates.

async function geocode(destination) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", destination);
  url.searchParams.set("count", "1");

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding lookup failed");
  const data = await res.json();
  const place = data.results?.[0];
  if (!place) return null;
  return {
    latitude: place.latitude,
    longitude: place.longitude,
    label: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
  };
}

function daysFromToday(dateStr) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  const target = new Date(dateStr);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function shiftYear(dateStr, deltaYears) {
  const d = new Date(dateStr);
  d.setUTCFullYear(d.getUTCFullYear() + deltaYears);
  return d.toISOString().slice(0, 10);
}

async function fetchDaily(baseUrl, params) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather lookup failed");
  return res.json();
}

export async function getTripWeather(destination, startDate, endDate) {
  const place = await geocode(destination);
  if (!place) {
    return { available: false, reason: `Couldn't find a location matching "${destination}"` };
  }

  const startOffset = daysFromToday(startDate);
  const endOffset = daysFromToday(endDate);
  const withinForecastRange = startOffset >= -1 && endOffset <= 15;

  const shared = {
    latitude: place.latitude,
    longitude: place.longitude,
    temperature_unit: "fahrenheit",
    timezone: "auto",
  };

  if (withinForecastRange) {
    // precipitation_probability_max is a forecast-only concept (from
    // ensemble models) — the archive API below has no "probability" field,
    // only actually-measured totals.
    const data = await fetchDaily("https://api.open-meteo.com/v1/forecast", {
      ...shared,
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
      start_date: startDate,
      end_date: endDate,
    });
    return summarize(place, data, "forecast");
  }

  // Fall back to last year's actuals for the same calendar dates as an estimate.
  const data = await fetchDaily("https://archive-api.open-meteo.com/v1/archive", {
    ...shared,
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max",
    start_date: shiftYear(startDate, -1),
    end_date: shiftYear(endDate, -1),
  });
  return summarize(place, data, "typical");
}

function summarize(place, data, kind) {
  const daily = data.daily;
  if (!daily || !daily.time?.length) {
    return { available: false, reason: "No weather data returned for those dates" };
  }

  const highs = daily.temperature_2m_max;
  const lows = daily.temperature_2m_min;
  const rainChance = daily.precipitation_probability_max || null;
  const rainSumMm = daily.precipitation_sum || null;
  const uv = daily.uv_index_max || null;

  const avg = (arr) => (arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const round = (n) => (n == null ? null : Math.round(n));
  const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

  return {
    available: true,
    kind, // "forecast" | "typical"
    location: place.label,
    avgHighF: round(avg(highs)),
    avgLowF: round(avg(lows)),
    // Forecast trips get a rain *chance* (%); typical/archive trips get an
    // actual measured total (mm) from last year instead, since "probability"
    // isn't a meaningful concept for historical data.
    maxPrecipChance: rainChance ? Math.max(...rainChance) : null,
    totalPrecipMm: rainSumMm ? round1(rainSumMm.reduce((a, b) => a + b, 0)) : null,
    avgUvIndex: round1(avg(uv)),
    days: daily.time.map((date, i) => ({
      date,
      highF: round(highs[i]),
      lowF: round(lows[i]),
      precipChance: rainChance ? rainChance[i] ?? null : null,
      precipMm: rainSumMm ? rainSumMm[i] ?? null : null,
      uvIndex: uv ? uv[i] ?? null : null,
    })),
  };
}
