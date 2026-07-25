# PackRat

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
- **Inspiration** — save looks you like for a trip (paste an image link, e.g.
  from Pinterest, or upload a photo).
- **Suggestions** — wardrobe items matched to the trip's activities and
  expected weather (e.g. "Fancy Dining" pulls formal pieces, "Beach" pulls
  swimwear).
- **Outfit ideas** — mix-and-match pairings from your wardrobe (e.g. "this
  shirt pairs with 3 bottoms for 3 looks"), so you can pack fewer pieces and
  get more outfits.
- **Packing list** — add suggested items, outfit pairings, or custom items,
  check them off, track progress against your suitcase size.

## Stack

- `server/` — Node/Express, Postgres (via `pg`), JWT-cookie auth.
- `client/` — React + Vite.
- Weather via [Open-Meteo](https://open-meteo.com/) (free, no API key).
- Photo storage: local disk for development, or [Supabase Storage](https://supabase.com/storage) in production (see Deploying below) — chosen because most free app-hosting plans wipe local disk on every restart, so photos need somewhere durable to live.

## Running it locally

Requires Node 18+ and a Postgres database. Two ways to get one:

- **Easiest**: create a free [Supabase](https://supabase.com) project (see
  step 1 under Deploying below) and use its connection string locally too —
  no local install needed.
- Or install Postgres locally and create an empty database.

```bash
# Terminal 1 — backend (http://localhost:4000)
cd server
npm install
echo "DATABASE_URL=your-postgres-connection-string" > .env
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm install
npm run dev
```

Open http://localhost:5173, create an account, and start adding wardrobe
items. The database schema is created automatically on first run.

Without `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` set, photos save to
`server/uploads/` on disk instead of the cloud — fine for local dev.

### Configuration

All optional for local dev; sensible defaults are used.

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | server | `4000` | Backend port |
| `DATABASE_URL` | server | a local Postgres on `localhost:5432` | Postgres connection string |
| `JWT_SECRET` | server | a fixed dev value | **Set this to a real secret before deploying anywhere.** |
| `CLIENT_ORIGIN` | server | `http://localhost:5173` | Allowed CORS origin for the login cookie |
| `NODE_ENV` | server | unset | Set to `production` when deployed — changes the login cookie's settings to work across two separate domains |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | server | unset | Enables cloud photo storage; falls back to local disk if unset |
| `VITE_API_URL` | client | `http://localhost:4000` | Backend URL the frontend calls |

## Deploying it for free (a real web address)

This uses two free services: **Supabase** (database + photo storage) and
**Render** (runs the app and gives you a URL). No terminal needed for any of
this — it's all clicking through each site's dashboard.

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Create a new project — pick any name and a database password (save it
   somewhere).
3. Once it's ready, go to **Project Settings → Database** and copy the
   **Connection string** (URI format). This is your `DATABASE_URL`.
4. Go to **Project Settings → API** and copy the **Project URL** (your
   `SUPABASE_URL`) and the **`service_role` secret key** (your
   `SUPABASE_SERVICE_ROLE_KEY` — keep this one private, never share or commit
   it).

You don't need to create any tables or storage buckets yourself — the app
creates its database tables and photo storage bucket automatically the first
time it starts up.

### 2. Deploy to Render

1. Go to [render.com](https://render.com) and sign up (free), ideally by
   connecting your GitHub account directly.
2. Click **New → Blueprint**, and pick this repository. Render will read the
   `render.yaml` file in this repo and set up two services: `pack-app-server`
   (the backend) and `pack-app-client` (the website you'll visit).
3. Render will ask you to fill in a few values before the first deploy —
   for `pack-app-server`, paste in:
   - `DATABASE_URL` → the connection string from step 1.3
   - `SUPABASE_URL` → from step 1.4
   - `SUPABASE_SERVICE_ROLE_KEY` → from step 1.4
   - `CLIENT_ORIGIN` → leave a placeholder like `https://placeholder.com` for
     now; you'll fix this in step 4.
   - `VITE_API_URL` (under `pack-app-client`) → same, placeholder for now.
4. Click **Deploy**. Both services will build — this takes a few minutes the
   first time.

### 3. Connect the two services to each other

Once both have deployed, each has its own `.onrender.com` address, visible on
its page in the Render dashboard.

1. Open the `pack-app-client` service, copy its URL.
2. Open the `pack-app-server` service → **Environment**, set `CLIENT_ORIGIN`
   to that URL, and save (this triggers an automatic redeploy).
3. Copy the `pack-app-server` service's URL.
4. Open the `pack-app-client` service → **Environment**, set `VITE_API_URL`
   to that URL, and save (this also redeploys — since this is a frontend
   build setting, it needs a rebuild to take effect, which the save
   triggers).

### 4. Visit your app

Once both redeploys finish, open the `pack-app-client` URL — that's your
app's permanent web address. Bookmark it.

**Note on the free tier:** Render's free web service "sleeps" after 15
minutes of no visits, so the first request after a while takes ~30–60 seconds
to wake up (later requests are fast). Your data and photos are unaffected —
they live in Supabase, not on Render's disk, so nothing is lost between
sleeps or redeploys.

## Roadmap

- **Phase 1 (this)** — wardrobe catalog, trip planning, weather, inspiration
  folders, outfit ideas, manual + suggested packing lists.
- **Phase 2** — richer inspiration handling (e.g. a live Pinterest
  connection, subject to their API terms).
- **Phase 3** — AI matching between inspiration images and your own wardrobe
  photos, so a saved outfit look gets mapped to the closest pieces you
  actually own. Needs a vision-capable AI API key to build.

## Notes

- `todo-demo/` is an earlier throwaway to-do list app kept for reference; it's
  unrelated to Pack.
