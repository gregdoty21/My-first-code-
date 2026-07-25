# Pack

A trip-packing app built around your actual wardrobe: photograph what you own,
plan a trip, and get packing suggestions pulled from your own closet instead
of a generic checklist.

This is **Phase 1** of a larger vision (see Roadmap below).

## What's here

- **Wardrobe catalog** — photograph clothes, shoes, and accessories; tag each
  with category, color, season, and formality.
- **Trips** — name a trip, set dates, destination, activities (hiking, beach,
  fancy dining, etc.), and a suitcase size.
- **Weather** — automatic lookup for the trip's destination and dates (real
  forecast if the trip is soon, a "typical" estimate from last year's weather
  if it's further out).
- **Suggestions** — wardrobe items matched to the trip's activities and
  expected weather (e.g. "Fancy Dining" pulls formal pieces, "Beach" pulls
  swimwear).
- **Packing list** — add suggested or custom items, check them off, track
  progress against your suitcase size.

## Stack

- `server/` — Node/Express + SQLite (`better-sqlite3`), session-based auth,
  local photo storage under `server/uploads/`.
- `client/` — React + Vite.
- Weather via [Open-Meteo](https://open-meteo.com/) (free, no API key).

## Running it locally

Requires Node 18+.

```bash
# Terminal 1 — backend (http://localhost:4000)
cd server
npm install
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm install
npm run dev
```

Open http://localhost:5173, create an account, and start adding wardrobe
items.

Photos are stored on disk under `server/uploads/` and the database is a
single SQLite file at `server/data.sqlite` — both are gitignored, so a fresh
clone starts empty.

### Configuration

Both are optional; sensible defaults are used for local development.

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | server | `4000` | Backend port |
| `SESSION_SECRET` | server | a fixed dev value | **Set this to a real secret before deploying anywhere.** |
| `CLIENT_ORIGIN` | server | `http://localhost:5173` | Allowed CORS origin for cookies |
| `VITE_API_URL` | client | `http://localhost:4000` | Backend URL the frontend calls |

## Roadmap

- **Phase 1 (this)** — wardrobe catalog, trip planning, weather, manual +
  suggested packing lists.
- **Phase 2** — inspiration folders per trip (upload/paste images of looks
  you like, e.g. from Pinterest).
- **Phase 3** — AI matching between inspiration images and your own wardrobe
  photos, so a saved outfit look gets mapped to the closest pieces you
  actually own.

## Notes

- Session storage is in-memory (fine for local dev; swap for a persistent
  store like `connect-sqlite3` before deploying for real).
- `todo-demo/` is an earlier throwaway to-do list app kept for reference; it's
  unrelated to Pack.
