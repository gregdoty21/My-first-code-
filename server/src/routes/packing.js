import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "./auth.js";

// Mounted separately (at /api/trips and /api/packing respectively) instead of
// broadly at /api, so their auth requirement can't shadow unrelated routes
// like /api/health or /api/meta that share the /api prefix.
export const tripPackingRouter = Router();
tripPackingRouter.use(requireAuth);

export const packingItemRouter = Router();
packingItemRouter.use(requireAuth);

async function ownedTrip(req, tripId) {
  const result = await pool.query("SELECT * FROM trips WHERE id = $1 AND user_id = $2", [
    tripId,
    req.userId,
  ]);
  return result.rows[0];
}

const SELECT_COLUMNS = `
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
`;

async function listForTrip(tripId) {
  const result = await pool.query(
    `SELECT ${SELECT_COLUMNS} WHERE packing_items.trip_id = $1 ORDER BY packing_items.created_at ASC`,
    [tripId]
  );
  return result.rows;
}

async function findById(id) {
  const result = await pool.query(`SELECT ${SELECT_COLUMNS} WHERE packing_items.id = $1`, [id]);
  return result.rows[0];
}

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
tripPackingRouter.get("/:tripId/packing", async (req, res) => {
  const trip = await ownedTrip(req, req.params.tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  const rows = await listForTrip(trip.id);
  res.json(rows.map(shape));
});

// POST /api/trips/:tripId/packing  { wardrobe_item_id } or { custom_name }
tripPackingRouter.post("/:tripId/packing", async (req, res) => {
  const trip = await ownedTrip(req, req.params.tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const { wardrobe_item_id, custom_name } = req.body || {};
  if (!wardrobe_item_id && !custom_name?.trim()) {
    return res.status(400).json({ error: "Provide a wardrobe_item_id or a custom_name" });
  }

  if (wardrobe_item_id) {
    const owned = await pool.query("SELECT id FROM wardrobe_items WHERE id = $1 AND user_id = $2", [
      wardrobe_item_id,
      req.userId,
    ]);
    if (!owned.rows[0]) return res.status(404).json({ error: "Wardrobe item not found" });
  }

  const inserted = await pool.query(
    "INSERT INTO packing_items (trip_id, wardrobe_item_id, custom_name) VALUES ($1, $2, $3) RETURNING id",
    [trip.id, wardrobe_item_id || null, wardrobe_item_id ? null : custom_name.trim()]
  );

  const row = await findById(inserted.rows[0].id);
  res.status(201).json(shape(row));
});

// PATCH /api/packing/:id  { packed }
packingItemRouter.patch("/:id", async (req, res) => {
  const owned = await pool.query(
    `SELECT packing_items.id FROM packing_items
     JOIN trips ON trips.id = packing_items.trip_id
     WHERE packing_items.id = $1 AND trips.user_id = $2`,
    [req.params.id, req.userId]
  );
  if (!owned.rows[0]) return res.status(404).json({ error: "Packing item not found" });

  await pool.query("UPDATE packing_items SET packed = $1 WHERE id = $2", [
    Boolean(req.body?.packed),
    req.params.id,
  ]);

  const updated = await findById(req.params.id);
  res.json(shape(updated));
});

// DELETE /api/packing/:id
packingItemRouter.delete("/:id", async (req, res) => {
  const owned = await pool.query(
    `SELECT packing_items.id FROM packing_items
     JOIN trips ON trips.id = packing_items.trip_id
     WHERE packing_items.id = $1 AND trips.user_id = $2`,
    [req.params.id, req.userId]
  );
  if (!owned.rows[0]) return res.status(404).json({ error: "Packing item not found" });

  await pool.query("DELETE FROM packing_items WHERE id = $1", [req.params.id]);
  res.status(204).end();
});
