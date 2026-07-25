import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export const authRouter = Router();

const isProd = process.env.NODE_ENV === "production";
const COOKIE_NAME = "pack_token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// Stateless JWT in an httpOnly cookie, not a server-side session store — free
// hosts routinely restart/sleep the app between requests, which would wipe an
// in-memory session (and a DB-backed store is one more moving part to run).
// sameSite:"none" is required for the cookie to survive when the deployed
// frontend and backend live on different Render subdomains; that requires
// secure:true, which in turn requires HTTPS (Render provides this by
// default), so it's gated on NODE_ENV=production rather than always-on.
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

function issueToken(res, userId) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Not signed in" });
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "Not signed in" });
  }
}

function publicUser(row) {
  return { id: row.id, email: row.email, name: row.name };
}

authRouter.post("/register", async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.rows.length) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name",
    [email.toLowerCase(), passwordHash, name.trim()]
  );

  const user = result.rows[0];
  issueToken(res, user.id);
  res.status(201).json(publicUser(user));
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  issueToken(res, user.id);
  res.json(publicUser(user));
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query("SELECT id, email, name FROM users WHERE id = $1", [req.userId]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Not signed in" });
  res.json(publicUser(user));
});
