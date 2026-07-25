// Weather lookups via Open-Meteo — free, no API key required. Celsius
// throughout (this app's audience is Canadian).
//
// Trips within the ~16-day forecast window get a real forecast; trips further
// out get "typical" weather estimated from last year's archive for the same
// dates. The general (non-trip) location lookup used by the weather explorer
// always uses the forecast API for the next few days.

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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchDaily(baseUrl, params) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather lookup failed");
  return res.json();
}

// Trip-specific: weather for a destination over a date range (used
// internally to pick a season for wardrobe suggestions/outfits).
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
    temperature_unit: "celsius",
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

// General lookup: current/near-term (next 5 days) weather for any place,
// not tied to a specific trip's dates.
export async function getLocationWeather(query) {
  const place = await geocode(query);
  if (!place) {
    return { available: false, reason: `Couldn't find "${query}"` };
  }

  const start = todayStr();
  const end = new Date();
  end.setDate(end.getDate() + 4);

  const data = await fetchDaily("https://api.open-meteo.com/v1/forecast", {
    latitude: place.latitude,
    longitude: place.longitude,
    temperature_unit: "celsius",
    timezone: "auto",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
    start_date: start,
    end_date: end.toISOString().slice(0, 10),
  });
  return summarize(place, data, "forecast");
}

// Standard EPA/WHO UV index scale.
function uvLabel(uv) {
  if (uv == null) return null;
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very High";
  return "Extreme";
}

// Plain-language precipitation summary instead of a raw percentage/total —
// snow takes priority when it's cold enough for precipitation to fall as
// snow, otherwise a rain-chance band.
function precipLabel(avgLowC, precipChancePct, totalPrecipMm) {
  // Archive/typical trips have no chance %, only a measured total — treat any
  // meaningful accumulation as "chance" for labeling purposes.
  const chance = precipChancePct != null ? precipChancePct : totalPrecipMm != null ? Math.min(100, totalPrecipMm * 5) : null;
  if (chance == null) return null;

  const likelySnow = avgLowC != null && avgLowC <= 0;
  if (likelySnow && chance >= 20) return "Snowy";
  if (chance < 15) return "Not rainy";
  if (chance < 40) return "A little rain";
  if (chance < 70) return "Rainy";
  return "Very rainy";
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

  const avgHighC = round(avg(highs));
  const avgLowC = round(avg(lows));
  const maxPrecipChance = rainChance ? Math.max(...rainChance) : null;
  const totalPrecipMm = rainSumMm ? round1(rainSumMm.reduce((a, b) => a + b, 0)) : null;
  const avgUvIndex = round1(avg(uv));

  return {
    available: true,
    kind, // "forecast" | "typical"
    location: place.label,
    avgHighC,
    avgLowC,
    // Forecast gets a rain *chance* (%); typical/archive gets an actual
    // measured total (mm) from last year instead, since "probability" isn't
    // a meaningful concept for historical data.
    maxPrecipChance,
    totalPrecipMm,
    avgUvIndex,
    uvLabel: uvLabel(avgUvIndex),
    precipLabel: precipLabel(avgLowC, maxPrecipChance, totalPrecipMm),
    days: daily.time.map((date, i) => ({
      date,
      highC: round(highs[i]),
      lowC: round(lows[i]),
      precipChance: rainChance ? rainChance[i] ?? null : null,
      precipMm: rainSumMm ? rainSumMm[i] ?? null : null,
      uvIndex: uv ? uv[i] ?? null : null,
    })),
  };
}
