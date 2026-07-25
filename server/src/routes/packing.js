import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "./auth.js";

// Mounted separately (at /api/trips and /api/packing respectively) instead of
// broadly at /api, so their auth requirement can't shadow unrelated routes
// like /api/health or /api/meta that share the /api prefix.
export const tripPackingRouter = Router();
tripPackingRouter.use(requireAuth);

export const packingItemRouter = Router();
packingItemRouter.use(requireAuth);

function ownedTrip(req, tripId) {
  return db.prepare("SELECT * FROM trips WHERE id = ? AND user_id = ?").get(tripId, req.session.userId);
}

const listQuery = `
  SELECT
    packing_items.id,
    packing_items.trip_id,
    packing_items.wardrobe_item_id,
    packing_items.custom_name,
    packing_items.packed,
    packing_items.created_at,
    wardrobe_items.name AS wardrobe_name,
    wardrobe_items.photo_path AS wardrobe_photo_path,
    wardrobe_items.category AS wardrobe_category
  FROM packing_items
  LEFT JOIN wardrobe_items ON wardrobe_items.id = packing_items.wardrobe_item_id
  WHERE packing_items.trip_id = ?
  ORDER BY packing_items.created_at ASC
`;

function shape(row) {
  return {
    id: row.id,
    trip_id: row.trip_id,
    packed: Boolean(row.packed),
    created_at: row.created_at,
    name: row.wardrobe_name || row.custom_name,
    from_wardrobe: Boolean(row.wardrobe_item_id),
    wardrobe_item_id: row.wardrobe_item_id,
    photo_path: row.wardrobe_photo_path || null,
    category: row.wardrobe_category || null,
  };
}

// GET /api/trips/:tripId/packing
tripPackingRouter.get("/:tripId/packing", (req, res) => {
  const trip = ownedTrip(req, req.params.tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  const rows = db.prepare(listQuery).all(trip.id);
  res.json(rows.map(shape));
});

// POST /api/trips/:tripId/packing  { wardrobe_item_id } or { custom_name }
tripPackingRouter.post("/:tripId/packing", (req, res) => {
  const trip = ownedTrip(req, req.params.tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const { wardrobe_item_id, custom_name } = req.body || {};
  if (!wardrobe_item_id && !custom_name?.trim()) {
    return res.status(400).json({ error: "Provide a wardrobe_item_id or a custom_name" });
  }

  if (wardrobe_item_id) {
    const item = db
      .prepare("SELECT id FROM wardrobe_items WHERE id = ? AND user_id = ?")
      .get(wardrobe_item_id, req.session.userId);
    if (!item) return res.status(404).json({ error: "Wardrobe item not found" });
  }

  const result = db
    .prepare("INSERT INTO packing_items (trip_id, wardrobe_item_id, custom_name) VALUES (?, ?, ?)")
    .run(trip.id, wardrobe_item_id || null, wardrobe_item_id ? null : custom_name.trim());

  const row = db.prepare(listQuery.replace("WHERE packing_items.trip_id = ?", "WHERE packing_items.id = ?")).get(
    result.lastInsertRowid
  );
  res.status(201).json(shape(row));
});

// PATCH /api/packing/:id  { packed }
packingItemRouter.patch("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT packing_items.* FROM packing_items
       JOIN trips ON trips.id = packing_items.trip_id
       WHERE packing_items.id = ? AND trips.user_id = ?`
    )
    .get(req.params.id, req.session.userId);
  if (!row) return res.status(404).json({ error: "Packing item not found" });

  const packed = req.body?.packed ? 1 : 0;
  db.prepare("UPDATE packing_items SET packed = ? WHERE id = ?").run(packed, row.id);

  const updated = db.prepare(listQuery.replace("WHERE packing_items.trip_id = ?", "WHERE packing_items.id = ?")).get(
    row.id
  );
  res.json(shape(updated));
});

// DELETE /api/packing/:id
packingItemRouter.delete("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT packing_items.* FROM packing_items
       JOIN trips ON trips.id = packing_items.trip_id
       WHERE packing_items.id = ? AND trips.user_id = ?`
    )
    .get(req.params.id, req.session.userId);
  if (!row) return res.status(404).json({ error: "Packing item not found" });

  db.prepare("DELETE FROM packing_items WHERE id = ?").run(row.id);
  res.status(204).end();
});
