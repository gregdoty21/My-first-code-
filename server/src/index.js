import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initSchema } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { wardrobeRouter } from "./routes/wardrobe.js";
import { tripsRouter } from "./routes/trips.js";
import { tripPackingRouter, packingItemRouter } from "./routes/packing.js";
import { tripInspirationRouter, inspirationItemRouter } from "./routes/inspiration.js";
import { metaRouter } from "./routes/meta.js";
import { weatherRouter } from "./routes/weather.js";
import { tryonRouter } from "./routes/tryon.js";
import { profileRouter } from "./routes/profile.js";
import { chatRouter } from "./routes/chat.js";
import { uploadsDir, ensureBucket } from "./storage.js";

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Only relevant when running without SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
// (local-disk storage fallback) — see storage.js.
app.use("/uploads", express.static(uploadsDir));

app.use("/api/auth", authRouter);
app.use("/api/wardrobe", wardrobeRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/trips", tripPackingRouter);
app.use("/api/packing", packingItemRouter);
app.use("/api/trips", tripInspirationRouter);
app.use("/api/inspiration", inspirationItemRouter);
app.use("/api/meta", metaRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/tryon", tryonRouter);
app.use("/api/profile", profileRouter);
app.use("/api/chat", chatRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong" });
});

initSchema()
  .then(() => ensureBucket())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Pack app server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database schema:", err);
    process.exit(1);
  });
