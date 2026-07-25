import express from "express";
import cors from "cors";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./db.js";
import { authRouter } from "./routes/auth.js";
import { wardrobeRouter } from "./routes/wardrobe.js";
import { tripsRouter } from "./routes/trips.js";
import { tripPackingRouter, packingItemRouter } from "./routes/packing.js";
import { tripInspirationRouter, inspirationItemRouter } from "./routes/inspiration.js";
import { metaRouter } from "./routes/meta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/auth", authRouter);
app.use("/api/wardrobe", wardrobeRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/trips", tripPackingRouter);
app.use("/api/packing", packingItemRouter);
app.use("/api/trips", tripInspirationRouter);
app.use("/api/inspiration", inspirationItemRouter);
app.use("/api/meta", metaRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong" });
});

app.listen(PORT, () => {
  console.log(`Pack app server listening on http://localhost:${PORT}`);
});
