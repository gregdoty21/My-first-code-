import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "./auth.js";
import { getTripWeather } from "../weather.js";
import {
  ACTIVITIES,
  SUITCASE_SIZES,
  ACTIVITY_FORMALITY,
  ACTIVITY_CATEGORY,
} from "../constants.js";

export const tripsRouter = Router();
tripsRouter.use(requireAuth);

const suitcaseIds = SUITCASE_SIZES.map((s) => s.id);

function parseTrip(row) {
  return { ...row, activities: JSON.parse(row.activities) };
}

function validateTripInput({ name, destination, start_date, end_date, activities, suitcase_size }) {
  if (!name || !destination || !start_date || !end_date) {
    return "Name, destination, start date, and end date are required";
  }
  if (new Date(end_date) < new Date(start_date)) {
    return "End date must be on or after the start date";
  }
  if (activities && (!Array.isArray(activities) || activities.some((a) => !ACTIVITIES.includes(a)))) {
    return "One or more activities are not recognized";
  }
  if (suitcase_size && !suitcaseIds.includes(suitcase_size)) {
    return "Unrecognized suitcase size";
  }
  return null;
}

tripsRouter.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM trips WHERE user_id = ? ORDER BY start_date ASC")
    .all(req.session.userId);
  res.json(rows.map(parseTrip));
});

tripsRouter.post("/", (req, res) => {
  const { name, destination, start_date, end_date, activities = [], suitcase_size = "carry-on" } =
    req.body || {};
  const error = validateTripInput({ name, destination, start_date, end_date, activities, suitcase_size });
  if (error) return res.status(400).json({ error });

  const result = db
    .prepare(
      `INSERT INTO trips (user_id, name, destination, start_date, end_date, activities, suitcase_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.session.userId,
      name.trim(),
      destination.trim(),
      start_date,
      end_date,
      JSON.stringify(activities),
      suitcase_size
    );

  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(parseTrip(trip));
});

function getOwnedTrip(req, res) {
  const trip = db
    .prepare("SELECT * FROM trips WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.session.userId);
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return null;
  }
  return trip;
}

tripsRouter.get("/:id", (req, res) => {
  const trip = getOwnedTrip(req, res);
  if (!trip) return;
  res.json(parseTrip(trip));
});

tripsRouter.patch("/:id", (req, res) => {
  const trip = getOwnedTrip(req, res);
  if (!trip) return;

  const { name, destination, start_date, end_date, activities, suitcase_size } = req.body || {};
  const merged = {
    name: name?.trim() || trip.name,
    destination: destination?.trim() || trip.destination,
    start_date: start_date || trip.start_date,
    end_date: end_date || trip.end_date,
    activities: activities !== undefined ? activities : JSON.parse(trip.activities),
    suitcase_size: suitcase_size || trip.suitcase_size,
  };
  const error = validateTripInput(merged);
  if (error) return res.status(400).json({ error });

  db.prepare(
    `UPDATE trips SET name = ?, destination = ?, start_date = ?, end_date = ?, activities = ?, suitcase_size = ?
     WHERE id = ?`
  ).run(
    merged.name,
    merged.destination,
    merged.start_date,
    merged.end_date,
    JSON.stringify(merged.activities),
    merged.suitcase_size,
    trip.id
  );

  res.json(parseTrip(db.prepare("SELECT * FROM trips WHERE id = ?").get(trip.id)));
});

tripsRouter.delete("/:id", (req, res) => {
  const trip = getOwnedTrip(req, res);
  if (!trip) return;
  db.prepare("DELETE FROM trips WHERE id = ?").run(trip.id);
  res.status(204).end();
});

tripsRouter.get("/:id/weather", async (req, res) => {
  const trip = getOwnedTrip(req, res);
  if (!trip) return;
  try {
    const weather = await getTripWeather(trip.destination, trip.start_date, trip.end_date);
    res.json(weather);
  } catch (err) {
    // "Unavailable" is an expected, handled app state (bad destination, weather
    // service down, network hiccup) — not a server error — so respond 200 and
    // let the client branch on `available` like it does for every other case.
    res.json({ available: false, reason: "Couldn't reach the weather service right now" });
  }
});

// Shared by /suggestions and /outfits: which of the user's wardrobe items fit
// this trip's weather and planned activities.
async function getTripRelevantItems(userId, trip) {
  const activities = JSON.parse(trip.activities);

  let targetSeason = null;
  try {
    const weather = await getTripWeather(trip.destination, trip.start_date, trip.end_date);
    if (weather.available) {
      if (weather.avgHighF >= 75) targetSeason = "warm";
      else if (weather.avgHighF <= 55) targetSeason = "cold";
    }
  } catch {
    // Weather is best-effort here; fall through with no season filter.
  }

  const desiredFormality = new Set();
  const desiredCategories = new Set();
  for (const activity of activities) {
    (ACTIVITY_FORMALITY[activity] || []).forEach((f) => desiredFormality.add(f));
    (ACTIVITY_CATEGORY[activity] || []).forEach((c) => desiredCategories.add(c));
  }

  const items = db.prepare("SELECT * FROM wardrobe_items WHERE user_id = ?").all(userId);

  const relevant = items.filter((item) => {
    const seasonOk = !targetSeason || item.season === targetSeason || item.season === "all-season";
    const specialCategory = desiredCategories.has(item.category);
    const formalityOk = desiredFormality.size === 0 || desiredFormality.has(item.formality);
    return seasonOk && (specialCategory || formalityOk);
  });

  return { targetSeason, items: relevant };
}

tripsRouter.get("/:id/suggestions", async (req, res) => {
  const trip = getOwnedTrip(req, res);
  if (!trip) return;
  const { targetSeason, items } = await getTripRelevantItems(req.session.userId, trip);
  res.json({ targetSeason, suggested: items });
});

tripsRouter.get("/:id/outfits", async (req, res) => {
  const trip = getOwnedTrip(req, res);
  if (!trip) return;
  const { targetSeason, items } = await getTripRelevantItems(req.session.userId, trip);

  const tops = items.filter((i) => i.category === "Tops");
  const bottoms = items.filter((i) => i.category === "Bottoms");
  const dresses = items.filter((i) => i.category === "Dresses");

  // Same formality only, for now — keeps pairings predictable ("casual top with
  // casual bottom") rather than guessing at cross-formality mixing rules.
  const pairings = tops
    .map((top) => ({
      top,
      bottoms: bottoms.filter((b) => b.formality === top.formality),
    }))
    .filter((p) => p.bottoms.length > 0)
    .sort((a, b) => b.bottoms.length - a.bottoms.length);

  res.json({ targetSeason, pairings, dresses });
});
