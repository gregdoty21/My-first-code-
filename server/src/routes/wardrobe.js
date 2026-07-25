import { Router } from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth } from "./auth.js";
import { saveFile, deleteFile } from "../storage.js";
import { CATEGORIES, SEASONS, FORMALITY } from "../constants.js";

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

export const wardrobeRouter = Router();
wardrobeRouter.use(requireAuth);

function validateTags({ category, season, formality }) {
  if (category && !CATEGORIES.includes(category)) return `Invalid category: ${category}`;
  if (season && !SEASONS.includes(season)) return `Invalid season: ${season}`;
  if (formality && !FORMALITY.includes(formality)) return `Invalid formality: ${formality}`;
  return null;
}

wardrobeRouter.get("/", async (req, res) => {
  const { category } = req.query;
  const result = category
    ? await pool.query(
        "SELECT * FROM wardrobe_items WHERE user_id = $1 AND category = $2 ORDER BY created_at DESC",
        [req.userId, category]
      )
    : await pool.query("SELECT * FROM wardrobe_items WHERE user_id = $1 ORDER BY created_at DESC", [
        req.userId,
      ]);
  res.json(result.rows);
});

wardrobeRouter.post("/", upload.single("photo"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "A photo is required" });
  }
  const { name, category, color, season, formality } = req.body || {};
  if (!name || !category) {
    return res.status(400).json({ error: "Name and category are required" });
  }
  const error = validateTags({ category, season, formality });
  if (error) return res.status(400).json({ error });

  const photoPath = await saveFile(req.file.buffer, req.file.originalname, req.file.mimetype);

  const result = await pool.query(
    `INSERT INTO wardrobe_items (user_id, photo_path, name, category, color, season, formality)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      req.userId,
      photoPath,
      name.trim(),
      category,
      (color || "").trim(),
      season || "all-season",
      formality || "casual",
    ]
  );

  res.status(201).json(result.rows[0]);
});

wardrobeRouter.patch("/:id", async (req, res) => {
  const existing = await pool.query("SELECT * FROM wardrobe_items WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.userId,
  ]);
  const item = existing.rows[0];
  if (!item) return res.status(404).json({ error: "Item not found" });

  const { name, category, color, season, formality } = req.body || {};
  const error = validateTags({ category, season, formality });
  if (error) return res.status(400).json({ error });

  const result = await pool.query(
    `UPDATE wardrobe_items SET name = $1, category = $2, color = $3, season = $4, formality = $5
     WHERE id = $6 RETURNING *`,
    [
      name?.trim() || item.name,
      category || item.category,
      color !== undefined ? color.trim() : item.color,
      season || item.season,
      formality || item.formality,
      item.id,
    ]
  );

  res.json(result.rows[0]);
});

wardrobeRouter.delete("/:id", async (req, res) => {
  const existing = await pool.query("SELECT * FROM wardrobe_items WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.userId,
  ]);
  const item = existing.rows[0];
  if (!item) return res.status(404).json({ error: "Item not found" });

  await pool.query("DELETE FROM wardrobe_items WHERE id = $1", [item.id]);
  await deleteFile(item.photo_path);
  res.status(204).end();
});
