import pg from "pg";

const { Pool } = pg;

// Local dev defaults to a local Postgres instance (no env var needed). In
// production, DATABASE_URL points at a hosted Postgres (e.g. Supabase) and
// needs SSL — hosted providers generally use certs that don't chain to a
// standard root, hence rejectUnauthorized: false, matching those providers'
// documented Node connection setup.
const connectionString =
  process.env.DATABASE_URL || "postgres://packapp:packapp_dev@localhost:5432/packapp";

export const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wardrobe_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      photo_path TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      color TEXT,
      season TEXT NOT NULL DEFAULT 'all-season',
      formality TEXT NOT NULL DEFAULT 'casual',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      destination TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      activities JSONB NOT NULL DEFAULT '[]'::jsonb,
      suitcase_size TEXT NOT NULL DEFAULT 'carry-on',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS packing_items (
      id SERIAL PRIMARY KEY,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      wardrobe_item_id INTEGER REFERENCES wardrobe_items(id) ON DELETE CASCADE,
      custom_name TEXT,
      packed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (wardrobe_item_id IS NOT NULL OR custom_name IS NOT NULL)
    );

    CREATE TABLE IF NOT EXISTS inspiration_images (
      id SERIAL PRIMARY KEY,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      image_path TEXT,
      image_url TEXT,
      caption TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (image_path IS NOT NULL OR image_url IS NOT NULL)
    );

    CREATE INDEX IF NOT EXISTS idx_wardrobe_user ON wardrobe_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
    CREATE INDEX IF NOT EXISTS idx_packing_trip ON packing_items(trip_id);
    CREATE INDEX IF NOT EXISTS idx_inspiration_trip ON inspiration_images(trip_id);
  `);
}
