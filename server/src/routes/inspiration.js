import { Router } from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth } from "./auth.js";
import { saveFile, deleteFile } from "../storage.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|heic|heif|gif)$/.test(file.mimetype)) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

// Only http(s) image URLs are accepted — this also rules out javascript:/data:
// URLs being stored and later rendered back out in an <img src>.
function isValidImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const tripInspirationRouter = Router();
tripInspirationRouter.use(requireAuth);

async function ownedTrip(req, tripId) {
  const result = await pool.query("SELECT * FROM trips WHERE id = $1 AND user_id = $2", [
    tripId,
    req.userId,
  ]);
  return result.rows[0];
}

tripInspirationRouter.get("/:tripId/inspiration", async (req, res) => {
  const trip = await ownedTrip(req, req.params.tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  const result = await pool.query(
    "SELECT * FROM inspiration_images WHERE trip_id = $1 ORDER BY created_at DESC",
    [trip.id]
  );
  res.json(result.rows);
});

tripInspirationRouter.post("/:tripId/inspiration", upload.single("photo"), async (req, res) => {
  const trip = await ownedTrip(req, req.params.tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const { image_url, caption } = req.body || {};

  if (req.file && image_url) {
    return res.status(400).json({ error: "Provide either an uploaded photo or an image URL, not both" });
  }

  let imagePath = null;
  if (req.file) {
    imagePath = await saveFile(req.file.buffer, req.file.originalname, req.file.mimetype);
  } else if (image_url) {
    if (!isValidImageUrl(image_url)) {
      return res.status(400).json({ error: "That doesn't look like a valid image URL" });
    }
  } else {
    return res.status(400).json({ error: "Provide either a photo upload or an image URL" });
  }

  const result = await pool.query(
    "INSERT INTO inspiration_images (trip_id, image_path, image_url, caption) VALUES ($1, $2, $3, $4) RETURNING *",
    [trip.id, imagePath, imagePath ? null : image_url.trim(), (caption || "").trim() || null]
  );

  res.status(201).json(result.rows[0]);
});

export const inspirationItemRouter = Router();
inspirationItemRouter.use(requireAuth);

inspirationItemRouter.delete("/:id", async (req, res) => {
  const existing = await pool.query(
    `SELECT inspiration_images.* FROM inspiration_images
     JOIN trips ON trips.id = inspiration_images.trip_id
     WHERE inspiration_images.id = $1 AND trips.user_id = $2`,
    [req.params.id, req.userId]
  );
  const row = existing.rows[0];
  if (!row) return res.status(404).json({ error: "Image not found" });

  await pool.query("DELETE FROM inspiration_images WHERE id = $1", [row.id]);
  await deleteFile(row.image_path);
  res.status(204).end();
});
