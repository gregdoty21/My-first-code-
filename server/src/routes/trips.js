import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "./auth.js";
import { getTripWeather, seasonFromWeather } from "../weather.js";
import { getStyleGuide } from "../styleGuide.js";
import {
  ACTIVITIES,
  SUITCASE_SIZES,
  ACTIVITY_FORMALITY,
  ACTIVITY_CATEGORY,
} from "../constants.js";

export const tripsRouter = Router();
tripsRouter.use(requireAuth);

const suitcaseIds = SUITCASE_SIZES.map((s) => s.id);

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

tripsRouter.get("/", async (req, res) => {
  const result = await pool.query("SELECT * FROM trips WHERE user_id = $1 ORDER BY start_date ASC", [
    req.userId,
  ]);
  res.json(result.rows);
});

tripsRouter.post("/", async (req, res) => {
  const { name, destination, start_date, end_date, activities = [], suitcase_size = "carry-on" } =
    req.body || {};
  const error = validateTripInput({ name, destination, start_date, end_date, activities, suitcase_size });
  if (error) return res.status(400).json({ error });

  const result = await pool.query(
    `INSERT INTO trips (user_id, name, destination, start_date, end_date, activities, suitcase_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      req.userId,
      name.trim(),
      destination.trim(),
      start_date,
      end_date,
      JSON.stringify(activities),
      suitcase_size,
    ]
  );

  res.status(201).json(result.rows[0]);
});

async function getOwnedTrip(req, res) {
  const result = await pool.query("SELECT * FROM trips WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.userId,
  ]);
  const trip = result.rows[0];
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return null;
  }
  return trip;
}

tripsRouter.get("/:id", async (req, res) => {
  const trip = await getOwnedTrip(req, res);
  if (!trip) return;
  res.json(trip);
});

tripsRouter.patch("/:id", async (req, res) => {
  const trip = await getOwnedTrip(req, res);
  if (!trip) return;

  const { name, destination, start_date, end_date, activities, suitcase_size } = req.body || {};
  const merged = {
    name: name?.trim() || trip.name,
    destination: destination?.trim() || trip.destination,
    start_date: start_date || trip.start_date,
    end_date: end_date || trip.end_date,
    activities: activities !== undefined ? activities : trip.activities,
    suitcase_size: suitcase_size || trip.suitcase_size,
  };
  const error = validateTripInput(merged);
  if (error) return res.status(400).json({ error });

  const result = await pool.query(
    `UPDATE trips SET name = $1, destination = $2, start_date = $3, end_date = $4, activities = $5, suitcase_size = $6
     WHERE id = $7 RETURNING *`,
    [
      merged.name,
      merged.destination,
      merged.start_date,
      merged.end_date,
      JSON.stringify(merged.activities),
      merged.suitcase_size,
      trip.id,
    ]
  );

  res.json(result.rows[0]);
});

tripsRouter.delete("/:id", async (req, res) => {
  const trip = await getOwnedTrip(req, res);
  if (!trip) return;
  await pool.query("DELETE FROM trips WHERE id = $1", [trip.id]);
  res.status(204).end();
});

// Shared by /suggestions, /outfits, and /style-guide: best-effort season
// (warm/cold/null) inferred from the trip's weather.
async function getTargetSeason(trip) {
  try {
    const weather = await getTripWeather(trip.destination, trip.start_date, trip.end_date);
    return seasonFromWeather(weather);
  } catch {
    // Weather is best-effort here; fall through with no season filter.
  }
  return null;
}

// Shared by /suggestions and /outfits: which of the user's wardrobe items fit
// this trip's weather and planned activities.
async function getTripRelevantItems(userId, trip) {
  const activities = trip.activities;
  const targetSeason = await getTargetSeason(trip);

  const desiredFormality = new Set();
  const desiredCategories = new Set();
  for (const activity of activities) {
    (ACTIVITY_FORMALITY[activity] || []).forEach((f) => desiredFormality.add(f));
    (ACTIVITY_CATEGORY[activity] || []).forEach((c) => desiredCategories.add(c));
  }

  const result = await pool.query("SELECT * FROM wardrobe_items WHERE user_id = $1", [userId]);

  const relevant = result.rows.filter((item) => {
    const seasonOk = !targetSeason || item.season === targetSeason || item.season === "all-season";
    const specialCategory = desiredCategories.has(item.category);
    const formalityOk = desiredFormality.size === 0 || desiredFormality.has(item.formality);
    return seasonOk && (specialCategory || formalityOk);
  });

  return { targetSeason, items: relevant };
}

tripsRouter.get("/:id/suggestions", async (req, res) => {
  const trip = await getOwnedTrip(req, res);
  if (!trip) return;
  const { targetSeason, items } = await getTripRelevantItems(req.userId, trip);
  res.json({ targetSeason, suggested: items });
});

tripsRouter.get("/:id/outfits", async (req, res) => {
  const trip = await getOwnedTrip(req, res);
  if (!trip) return;
  const { targetSeason, items } = await getTripRelevantItems(req.userId, trip);

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

tripsRouter.get("/:id/style-guide", async (req, res) => {
  const trip = await getOwnedTrip(req, res);
  if (!trip) return;
  const targetSeason = await getTargetSeason(trip);
  res.json(getStyleGuide(trip.destination, targetSeason, trip.activities));
});
