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
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "fahrenheit",
    timezone: "auto",
  };

  if (withinForecastRange) {
    const data = await fetchDaily("https://api.open-meteo.com/v1/forecast", {
      ...shared,
      start_date: startDate,
      end_date: endDate,
    });
    return summarize(place, data, "forecast");
  }

  // Fall back to last year's actuals for the same calendar dates as an estimate.
  const data = await fetchDaily("https://archive-api.open-meteo.com/v1/archive", {
    ...shared,
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
  const rain = daily.precipitation_probability_max || [];

  const avgHigh = highs.reduce((a, b) => a + b, 0) / highs.length;
  const avgLow = lows.reduce((a, b) => a + b, 0) / lows.length;
  const maxRainChance = rain.length ? Math.max(...rain) : null;

  return {
    available: true,
    kind, // "forecast" | "typical"
    location: place.label,
    avgHighF: Math.round(avgHigh),
    avgLowF: Math.round(avgLow),
    maxPrecipChance: maxRainChance,
    days: daily.time.map((date, i) => ({
      date,
      highF: Math.round(highs[i]),
      lowF: Math.round(lows[i]),
      precipChance: rain[i] ?? null,
    })),
  };
}
