import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "./auth.js";
import { loadImageAsBase64, chatWithRat, tryOnConfigured } from "../gemini.js";

export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.get("/configured", (req, res) => {
  res.json({ configured: tryOnConfigured });
});

chatRouter.post("/", async (req, res) => {
  const { message, history, tryon_result_id } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Say something for Rat to respond to" });
  }

  // Only the last dozen turns, and only well-formed ones — keeps the
  // request small and avoids trusting arbitrary client-supplied roles.
  const cleanHistory = Array.isArray(history)
    ? history
        .filter((h) => h && typeof h.text === "string" && (h.role === "user" || h.role === "rat"))
        .slice(-12)
    : [];

  let image = null;
  if (tryon_result_id) {
    const result = await pool.query(
      `SELECT tryon_results.* FROM tryon_results
       WHERE tryon_results.id = $1 AND tryon_results.user_id = $2`,
      [tryon_result_id, req.userId]
    );
    const row = result.rows[0];
    if (row) {
      try {
        image = await loadImageAsBase64(row.result_image_path);
      } catch (err) {
        console.error("Couldn't load try-on image for chat context:", err.message);
      }
    }
  }

  try {
    const reply = await chatWithRat({ message: message.trim(), history: cleanHistory, image });
    res.json({ reply });
  } catch (err) {
    console.error("Rat chat failed:", err.message);
    res.status(502).json({ error: "Rat got a little tongue-tied — try again in a moment." });
  }
});
