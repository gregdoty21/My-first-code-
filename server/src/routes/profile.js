import { Router } from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth } from "./auth.js";
import { saveFile, deleteFile } from "../storage.js";
import { INTERESTS, STYLE_VIBES } from "../constants.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.mimetype)) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

export const profileRouter = Router();
profileRouter.use(requireAuth);

// Every user gets a profile row lazily, on first read — simpler than
// creating one at registration time and keeping that in sync.
async function getOrCreateProfile(userId) {
  const existing = await pool.query("SELECT * FROM fashion_profiles WHERE user_id = $1", [userId]);
  if (existing.rows[0]) return existing.rows[0];
  const created = await pool.query("INSERT INTO fashion_profiles (user_id) VALUES ($1) RETURNING *", [userId]);
  return created.rows[0];
}

profileRouter.get("/", async (req, res) => {
  const profile = await getOrCreateProfile(req.userId);
  const photos = await pool.query("SELECT * FROM profile_photos WHERE user_id = $1 ORDER BY created_at DESC", [
    req.userId,
  ]);
  res.json({ ...profile, photos: photos.rows });
});

profileRouter.put("/", async (req, res) => {
  const { interests = [], style_vibe = [], favorite_colors, favorite_drink, bio } = req.body || {};

  if (!Array.isArray(interests) || interests.some((i) => !INTERESTS.includes(i))) {
    return res.status(400).json({ error: "One or more interests are not recognized" });
  }
  if (!Array.isArray(style_vibe) || style_vibe.some((s) => !STYLE_VIBES.includes(s))) {
    return res.status(400).json({ error: "One or more style vibes are not recognized" });
  }

  await getOrCreateProfile(req.userId);

  const result = await pool.query(
    `UPDATE fashion_profiles
     SET interests = $1, style_vibe = $2, favorite_colors = $3, favorite_drink = $4, bio = $5, updated_at = NOW()
     WHERE user_id = $6 RETURNING *`,
    [
      JSON.stringify(interests),
      JSON.stringify(style_vibe),
      (favorite_colors || "").trim() || null,
      (favorite_drink || "").trim() || null,
      (bio || "").trim() || null,
      req.userId,
    ]
  );

  res.json(result.rows[0]);
});

profileRouter.get("/photos", async (req, res) => {
  const result = await pool.query("SELECT * FROM profile_photos WHERE user_id = $1 ORDER BY created_at DESC", [
    req.userId,
  ]);
  res.json(result.rows);
});

profileRouter.post("/photos", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "A photo is required" });

  const photoPath = await saveFile(req.file.buffer, req.file.originalname, req.file.mimetype);
  const { caption } = req.body || {};

  const result = await pool.query(
    "INSERT INTO profile_photos (user_id, photo_path, caption) VALUES ($1, $2, $3) RETURNING *",
    [req.userId, photoPath, (caption || "").trim() || null]
  );

  res.status(201).json(result.rows[0]);
});

profileRouter.delete("/photos/:id", async (req, res) => {
  const existing = await pool.query("SELECT * FROM profile_photos WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.userId,
  ]);
  const photo = existing.rows[0];
  if (!photo) return res.status(404).json({ error: "Photo not found" });

  await pool.query("DELETE FROM profile_photos WHERE id = $1", [photo.id]);
  await deleteFile(photo.photo_path);
  res.status(204).end();
});
