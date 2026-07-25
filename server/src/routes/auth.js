import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";

export const authRouter = Router();

export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not signed in" });
  }
  next();
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

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
    .run(email.toLowerCase(), passwordHash, name.trim());

  req.session.userId = result.lastInsertRowid;
  const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(publicUser(user));
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  req.session.userId = user.id;
  res.json(publicUser(user));
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.status(204).end());
});

authRouter.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "Not signed in" });
  }
  res.json(publicUser(user));
});
