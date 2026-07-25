import { Router } from "express";
import multer from "multer";
import { pool } from "../db.js";
import { requireAuth } from "./auth.js";
import { saveFile, deleteFile } from "../storage.js";
import { tryOnConfigured, loadImageAsBase64, generateTryOn } from "../gemini.js";

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

export const tryonRouter = Router();
tryonRouter.use(requireAuth);

tryonRouter.get("/configured", (req, res) => {
  res.json({ configured: tryOnConfigured });
});

tryonRouter.get("/photos", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM tryon_photos WHERE user_id = $1 ORDER BY created_at DESC",
    [req.userId]
  );
  res.json(result.rows);
});

tryonRouter.post("/photos", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "A photo is required" });

  const photoPath = await saveFile(req.file.buffer, req.file.originalname, req.file.mimetype);
  const result = await pool.query(
    "INSERT INTO tryon_photos (user_id, photo_path) VALUES ($1, $2) RETURNING *",
    [req.userId, photoPath]
  );
  res.status(201).json(result.rows[0]);
});

tryonRouter.delete("/photos/:id", async (req, res) => {
  const existing = await pool.query("SELECT * FROM tryon_photos WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.userId,
  ]);
  const photo = existing.rows[0];
  if (!photo) return res.status(404).json({ error: "Photo not found" });

  await pool.query("DELETE FROM tryon_photos WHERE id = $1", [photo.id]);
  await deleteFile(photo.photo_path);
  res.status(204).end();
});

tryonRouter.get("/results", async (req, res) => {
  const result = await pool.query(
    `SELECT tryon_results.*, wardrobe_items.name AS item_name, wardrobe_items.photo_path AS item_photo_path,
            tryon_photos.photo_path AS source_photo_path
     FROM tryon_results
     JOIN wardrobe_items ON wardrobe_items.id = tryon_results.wardrobe_item_id
     JOIN tryon_photos ON tryon_photos.id = tryon_results.tryon_photo_id
     WHERE tryon_results.user_id = $1
     ORDER BY tryon_results.created_at DESC`,
    [req.userId]
  );
  res.json(result.rows);
});

tryonRouter.post("/generate", async (req, res) => {
  if (!tryOnConfigured) {
    return res.status(503).json({ error: "Virtual try-on isn't set up yet — ask the app owner to add a GEMINI_API_KEY." });
  }

  const { tryon_photo_id, wardrobe_item_id } = req.body || {};
  if (!tryon_photo_id || !wardrobe_item_id) {
    return res.status(400).json({ error: "A photo of yourself and a wardrobe item are both required" });
  }

  const [photoResult, itemResult] = await Promise.all([
    pool.query("SELECT * FROM tryon_photos WHERE id = $1 AND user_id = $2", [tryon_photo_id, req.userId]),
    pool.query("SELECT * FROM wardrobe_items WHERE id = $1 AND user_id = $2", [wardrobe_item_id, req.userId]),
  ]);
  const photo = photoResult.rows[0];
  const item = itemResult.rows[0];
  if (!photo) return res.status(404).json({ error: "Photo not found" });
  if (!item) return res.status(404).json({ error: "Wardrobe item not found" });

  let generated;
  try {
    const [personImage, itemImage] = await Promise.all([
      loadImageAsBase64(photo.photo_path),
      loadImageAsBase64(item.photo_path),
    ]);
    generated = await generateTryOn({ personImage, itemImage, itemName: item.name });
  } catch (err) {
    console.error("Try-on generation failed:", err.message);
    return res.status(502).json({ error: "Couldn't generate that try-on right now — please try again." });
  }

  const ext = generated.mimeType === "image/png" ? "png" : "jpg";
  const resultPath = await saveFile(generated.buffer, `tryon.${ext}`, generated.mimeType);

  const result = await pool.query(
    `INSERT INTO tryon_results (user_id, tryon_photo_id, wardrobe_item_id, result_image_path)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.userId, photo.id, item.id, resultPath]
  );

  res.status(201).json({ ...result.rows[0], item_name: item.name, item_photo_path: item.photo_path, source_photo_path: photo.photo_path });
});

tryonRouter.delete("/results/:id", async (req, res) => {
  const existing = await pool.query("SELECT * FROM tryon_results WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.userId,
  ]);
  const row = existing.rows[0];
  if (!row) return res.status(404).json({ error: "Result not found" });

  await pool.query("DELETE FROM tryon_results WHERE id = $1", [row.id]);
  await deleteFile(row.result_image_path);
  res.status(204).end();
});
