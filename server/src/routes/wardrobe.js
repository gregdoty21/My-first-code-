import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db } from "../db.js";
import { requireAuth } from "./auth.js";
import { CATEGORIES, SEASONS, FORMALITY } from "../constants.js";

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

wardrobeRouter.get("/", (req, res) => {
  const { category } = req.query;
  let rows;
  if (category) {
    rows = db
      .prepare("SELECT * FROM wardrobe_items WHERE user_id = ? AND category = ? ORDER BY created_at DESC")
      .all(req.session.userId, category);
  } else {
    rows = db
      .prepare("SELECT * FROM wardrobe_items WHERE user_id = ? ORDER BY created_at DESC")
      .all(req.session.userId);
  }
  res.json(rows);
});

wardrobeRouter.post("/", upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "A photo is required" });
  }
  const { name, category, color, season, formality } = req.body || {};
  if (!name || !category) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Name and category are required" });
  }
  const error = validateTags({ category, season, formality });
  if (error) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error });
  }

  const result = db
    .prepare(
      `INSERT INTO wardrobe_items (user_id, photo_path, name, category, color, season, formality)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.session.userId,
      `/uploads/${req.file.filename}`,
      name.trim(),
      category,
      (color || "").trim(),
      season || "all-season",
      formality || "casual"
    );

  const item = db.prepare("SELECT * FROM wardrobe_items WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(item);
});

wardrobeRouter.patch("/:id", (req, res) => {
  const item = db
    .prepare("SELECT * FROM wardrobe_items WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.session.userId);
  if (!item) return res.status(404).json({ error: "Item not found" });

  const { name, category, color, season, formality } = req.body || {};
  const error = validateTags({ category, season, formality });
  if (error) return res.status(400).json({ error });

  db.prepare(
    `UPDATE wardrobe_items SET name = ?, category = ?, color = ?, season = ?, formality = ? WHERE id = ?`
  ).run(
    name?.trim() || item.name,
    category || item.category,
    color !== undefined ? color.trim() : item.color,
    season || item.season,
    formality || item.formality,
    item.id
  );

  res.json(db.prepare("SELECT * FROM wardrobe_items WHERE id = ?").get(item.id));
});

wardrobeRouter.delete("/:id", (req, res) => {
  const item = db
    .prepare("SELECT * FROM wardrobe_items WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.session.userId);
  if (!item) return res.status(404).json({ error: "Item not found" });

  db.prepare("DELETE FROM wardrobe_items WHERE id = ?").run(item.id);
  const filePath = path.join(uploadsDir, path.basename(item.photo_path));
  fs.unlink(filePath, () => {});
  res.status(204).end();
});
