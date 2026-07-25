import { Router } from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth } from "./auth.js";
import { saveFile, deleteFile } from "../storage.js";
import { CATEGORIES, SUBCATEGORIES, SEASONS, FORMALITY } from "../constants.js";

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

function validateTags({ category, type, season, formality }) {
  if (category && !CATEGORIES.includes(category)) return `Invalid category: ${category}`;
  if (type && !(SUBCATEGORIES[category] || []).includes(type)) return `Invalid type "${type}" for category ${category}`;
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
  const { name, category, type, color, season, formality } = req.body || {};
  if (!name || !category) {
    return res.status(400).json({ error: "Name and category are required" });
  }
  const error = validateTags({ category, type, season, formality });
  if (error) return res.status(400).json({ error });

  const photoPath = await saveFile(req.file.buffer, req.file.originalname, req.file.mimetype);

  const result = await pool.query(
    `INSERT INTO wardrobe_items (user_id, photo_path, name, category, type, color, season, formality)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      req.userId,
      photoPath,
      name.trim(),
      category,
      type || null,
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

  const { name, category, type, color, season, formality } = req.body || {};

  const mergedCategory = category || item.category;
  // If the category is changing and no new type was given, the old type may
  // no longer apply (e.g. "Bikini top" doesn't make sense once moved out of
  // Swimwear) — drop it rather than carrying over a mismatched value.
  const mergedType = type !== undefined ? type || null : category && category !== item.category ? null : item.type;

  const error = validateTags({ category: mergedCategory, type: mergedType, season, formality });
  if (error) return res.status(400).json({ error });

  const result = await pool.query(
    `UPDATE wardrobe_items SET name = $1, category = $2, type = $3, color = $4, season = $5, formality = $6
     WHERE id = $7 RETURNING *`,
    [
      name?.trim() || item.name,
      mergedCategory,
      mergedType,
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
