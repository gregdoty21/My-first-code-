import { Router } from "express";
import { requireAuth } from "./auth.js";
import { getLocationWeather, seasonFromWeather } from "../weather.js";
import { getStyleGuide } from "../styleGuide.js";

export const weatherRouter = Router();
weatherRouter.use(requireAuth);

// A recognizable, varied mix for browsing — not exhaustive, just a starting
// point before searching for anywhere else.
const POPULAR_DESTINATIONS = [
  "Cancun, Mexico",
  "Punta Cana, Dominican Republic",
  "Orlando, United States",
  "Paris, France",
  "Rome, Italy",
  "Barcelona, Spain",
  "London, United Kingdom",
  "Tokyo, Japan",
];

async function buildEntry(name) {
  const weather = await getLocationWeather(name).catch((err) => {
    // Logged server-side (check Render's Logs tab) since the user-facing
    // message is deliberately generic — the real cause (rate limit, DNS,
    // timeout, ...) is far more useful in the logs than in the UI.
    console.error(`Weather lookup failed for "${name}":`, err.message);
    return { available: false, reason: "Couldn't reach the weather service right now" };
  });
  // No trip activities to factor in here — just climate + destination notes.
  const styleGuide = getStyleGuide(name, seasonFromWeather(weather), []);
  return { name, weather, styleGuide };
}

// Small batches, not one big Promise.all — firing 2 API calls (geocode +
// forecast) for each of 8 destinations at once (16 near-simultaneous
// requests) risked tripping Open-Meteo's burst rate limit, especially on a
// host that may share an outbound IP with other apps. 2 at a time keeps the
// burst small while still finishing in a few seconds rather than one-by-one.
const BATCH_SIZE = 2;

async function buildEntries(names) {
  const results = [];
  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);
    results.push(...(await Promise.all(batch.map(buildEntry))));
  }
  return results;
}

weatherRouter.get("/popular", async (req, res) => {
  res.json(await buildEntries(POPULAR_DESTINATIONS));
});

weatherRouter.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Provide a location to search for" });
  res.json(await buildEntry(q));
});
