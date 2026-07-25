import { Router } from "express";
import { requireAuth } from "./auth.js";
import { getLocationWeather } from "../weather.js";

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

weatherRouter.get("/popular", async (req, res) => {
  const results = await Promise.all(
    POPULAR_DESTINATIONS.map(async (name) => {
      const weather = await getLocationWeather(name).catch(() => ({
        available: false,
        reason: "Couldn't reach the weather service right now",
      }));
      return { name, weather };
    })
  );
  res.json(results);
});

weatherRouter.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Provide a location to search for" });

  const weather = await getLocationWeather(q).catch(() => ({
    available: false,
    reason: "Couldn't reach the weather service right now",
  }));
  res.json({ name: q, weather });
});
