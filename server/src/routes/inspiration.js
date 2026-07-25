import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db } from "../db.js";
import { requireAuth } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
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

function ownedTrip(req, tripId) {
  return db.prepare("SELECT * FROM trips WHERE id = ? AND user_id = ?").get(tripId, req.session.userId);
}

tripInspirationRouter.get("/:tripId/inspiration", (req, res) => {
  const trip = ownedTrip(req, req.params.tripId);
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  const rows = db
    .prepare("SELECT * FROM inspiration_images WHERE trip_id = ? ORDER BY created_at DESC")
    .all(trip.id);
  res.json(rows);
});

tripInspirationRouter.post("/:tripId/inspiration", upload.single("photo"), (req, res) => {
  const trip = ownedTrip(req, req.params.tripId);
  if (!trip) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: "Trip not found" });
  }

  const { image_url, caption } = req.body || {};

  if (req.file && image_url) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Provide either an uploaded photo or an image URL, not both" });
  }

  let imagePath = null;
  if (req.file) {
    imagePath = `/uploads/${req.file.filename}`;
  } else if (image_url) {
    if (!isValidImageUrl(image_url)) {
      return res.status(400).json({ error: "That doesn't look like a valid image URL" });
    }
  } else {
    return res.status(400).json({ error: "Provide either a photo upload or an image URL" });
  }

  const result = db
    .prepare(
      "INSERT INTO inspiration_images (trip_id, image_path, image_url, caption) VALUES (?, ?, ?, ?)"
    )
    .run(trip.id, imagePath, imagePath ? null : image_url.trim(), (caption || "").trim() || null);

  const row = db.prepare("SELECT * FROM inspiration_images WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(row);
});

export const inspirationItemRouter = Router();
inspirationItemRouter.use(requireAuth);

inspirationItemRouter.delete("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT inspiration_images.* FROM inspiration_images
       JOIN trips ON trips.id = inspiration_images.trip_id
       WHERE inspiration_images.id = ? AND trips.user_id = ?`
    )
    .get(req.params.id, req.session.userId);
  if (!row) return res.status(404).json({ error: "Image not found" });

  db.prepare("DELETE FROM inspiration_images WHERE id = ?").run(row.id);
  if (row.image_path) {
    const filePath = path.join(uploadsDir, path.basename(row.image_path));
    fs.unlink(filePath, () => {});
  }
  res.status(204).end();
});
