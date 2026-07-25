# PackRat — project memory

This file is read automatically by Claude Code at the start of every session
in this repo. It exists so a brand-new session (after this one runs out of
time/context) can pick up immediately without the user needing to re-explain
the app, its history, or in-flight decisions.

## What this app is

**PackRat**: a trip-packing app built around a photographed wardrobe. The
core idea: photograph your actual clothes/shoes/accessories once, then every
trip pulls packing suggestions and outfit ideas from your own closet instead
of a generic checklist. Audience is explicitly Canadian (Celsius everywhere).

## Vision (full, including not-yet-built parts)

The user's original ask, in full:

> Photograph entire wardrobe as the core data source. Connect to inspiration
> sites like Pinterest (folders per trip). AI matches "looks" to items in the
> closet. Trip-specific activity details (walking, hiking, sightseeing,
> beach, fancy/casual dining, etc.). Weather link for trip dates. Suitcase
> size selection. Outfit mix-and-match from wardrobe tags (e.g. "pack one
> shirt, wear it with three different bottoms"). A "Rat's Assistance"
> section: AI virtual try-on — upload photos of yourself, see wardrobe
> outfits on you.

Built so far (all of the above except two items, see Roadmap in README.md):
wardrobe catalog with rich tagging, trip planning, weather (popular
destinations + search, on the Trips page), inspiration image folders,
suggestions, outfit pairings, packing lists, single-photo AI virtual try-on
("Rat's Assistance").

**Deferred (too advanced for now, listed for the user's future reference):**
1. AI photo-to-closet matching (map a saved Pinterest look to the closest
   pieces you actually own) — needs a paid vision API, not yet built.
2. Multi-angle ("360", 5-photo) virtual try-on — scoped down to a
   single-photo v1 for cost/feasibility; the single-photo version is live.
3. Live Pinterest API connection (vs. today's manual paste-a-link/upload
   folders) — subject to Pinterest's API terms, not yet built.

## Hard constraints from the user (do not violate)

- **Never use the AskUserQuestion tool in this project.** Early in the
  project it cleared the user's draft prompt and they explicitly said "ok,
  please don't do that again." Ask plain-text questions in chat instead if
  something is genuinely ambiguous.
- **Hosting must stay fully free.** This drove the entire architecture:
  Postgres (Supabase free tier) instead of SQLite-on-disk, JWT cookies
  instead of server-side sessions, Supabase Storage instead of local disk —
  all because Render's free tier wipes local disk/memory on restart/redeploy.
- **Celsius, not Fahrenheit** — the user is Canadian and was explicit about
  this ("make sure its all for canadians so celcius").
- The user has identified as a beginner with deployment — when walking
  through Render/Supabase dashboard steps, be explicit and patient, expect to
  debug env var / connection string issues interactively.

## Architecture

- **Backend**: Node/Express (`server/`), ES modules. `server/src/index.js` is
  the entrypoint — mounts all routers, runs `initSchema()` then
  `ensureBucket()` before listening.
- **Frontend**: React + Vite + React Router (`client/`).
- **Database**: Postgres via `pg` (`server/src/db.js`). Three-tier connection
  config: `DATABASE_URL` string → individual `PGHOST`/`PGPORT`/`PGUSER`/
  `PGPASSWORD`/`PGDATABASE` vars → local default
  (`postgres://packapp:packapp_dev@localhost:5432/packapp`). Schema is
  created/migrated idempotently on every boot via `initSchema()` — new
  columns on existing tables go through `ALTER TABLE ... ADD COLUMN IF NOT
  EXISTS`, since `CREATE TABLE IF NOT EXISTS` is a no-op once a table already
  exists in production. **When adding a column to an existing table, always
  add it as a separate `ALTER TABLE` statement, never by editing the
  original `CREATE TABLE` block** — production already has that table.
- **Auth**: JWT in an httpOnly cookie (`server/src/routes/auth.js`), not
  `express-session` (sessions don't survive host restarts). `sameSite:
  "none", secure: true` in production (cross-domain frontend/backend on
  Render), `"lax"` locally.
- **Photo storage**: `server/src/storage.js` abstracts local disk (dev) vs.
  Supabase Storage (production), chosen by presence of `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`. Auto-creates its bucket on boot. `saveFile`
  returns either a full Supabase public URL or a same-origin `/uploads/...`
  path; `client/src/api.js`'s `photoUrl()` handles both.
- **Weather**: `server/src/weather.js`, Open-Meteo (free, no key). Forecast
  API for near-term (~16 days), archive API (last year's actuals) for
  further-out trips — these two APIs support different field names
  (`precipitation_probability_max` is forecast-only; archive uses
  `precipitation_sum`), a past bug source. `getLocationWeather()` (current +
  next 4 days, no dates needed) powers the Trips-page weather explorer;
  `getTripWeather()` (date-range specific) powers trip wardrobe-season
  logic. Both funnel through `summarize()` which computes Celsius stats, a
  plain-language UV label, and a plain-language precipitation label
  ("Not rainy" / "A little rain" / "Rainy" / "Very rainy" / "Snowy").
- **Style guide** (`server/src/styleGuide.js`): curated, zero-API-cost
  sunscreen/moisturizer/sunglasses/accessory suggestions (NOT clothing —
  explicitly changed from an earlier clothing-suggestion version) keyed by
  climate + trip activities, plus cultural/modesty notes for certain
  destinations (churches, mosques, temples). Links are always Google
  Shopping *search* URLs (`shopSearch()`), never fabricated direct product
  links.
- **Virtual try-on / "Rat's Assistance"** (`server/src/gemini.js`,
  `server/src/routes/tryon.js`, `client/src/pages/TryOn.jsx`): single-photo
  v1 using Google's Gemini 2.5 Flash Image ("Nano Banana") model, ~$0.039 per
  generated image. Fully optional — gated on `GEMINI_API_KEY` being set;
  without it, `tryOnConfigured` is `false` and the UI shows a friendly
  "not set up yet" message instead of erroring. `loadImageAsBase64()` reads
  a stored photo (local disk or a Supabase public URL) back into base64 for
  the Gemini request.
- **Deployment**: `render.yaml` Blueprint — two services, `pack-app-server`
  (Node) and `pack-app-client` (static site), one-click deploy. Supabase
  provides Postgres + Storage. Full beginner walkthrough is in `README.md`.

## Key files map

| File | Purpose |
|---|---|
| `server/src/db.js` | Pool config + `initSchema()` (all tables + migrations) |
| `server/src/constants.js` | `CATEGORIES`, `SUBCATEGORIES` (per-category garment types), `SEASONS`, `FORMALITY` (style tags), `ACTIVITIES`, `ACTIVITY_FORMALITY`, `ACTIVITY_CATEGORY`, `SUITCASE_SIZES` |
| `server/src/storage.js` | Local disk vs. Supabase Storage abstraction |
| `server/src/weather.js` | Open-Meteo lookups, Celsius, UV/precip labels |
| `server/src/styleGuide.js` | Sunscreen/accessory suggestions + cultural notes |
| `server/src/gemini.js` | Gemini virtual try-on client |
| `server/src/routes/*.js` | One router file per resource (auth, wardrobe, trips, packing, inspiration, weather, meta, tryon) |
| `client/src/api.js` | All frontend↔backend fetch calls in one place |
| `client/src/pages/*.jsx` | One page per route (Login, Register, Wardrobe, Trips, TripDetail, TryOn) |
| `client/src/styles.css` | All CSS, organized by section with comments |
| `render.yaml` | Render Blueprint (both services + env var list) |
| `README.md` | User-facing setup/deployment guide + roadmap |

## Current wardrobe tagging model (as of the last change)

Each wardrobe item has: `category` (broad: Tops/Bottoms/Dresses/Outerwear/
Shoes/Accessories/Swimwear/Activewear/Sleepwear/Other), an optional `type`
(specific garment within that category, e.g. Tops → Blouse/Button-up
shirt/Going-out top/...; Swimwear → Bikini top/Bikini bottom/One-piece
swimsuit/...; see `SUBCATEGORIES` in constants.js for the full list per
category), `color` (free text), `season` (warm/cold/all-season), and
`formality` — despite the column/API name staying `formality` for backward
compatibility with existing data, this is really a "style" tag and the UI
labels it "Style": casual/activewear/loungewear/business/going-out/formal.
When a wardrobe item's category changes via PATCH and no new `type` is
given, the old `type` is cleared (it likely no longer applies).

## Testing

No formal test framework — verification is done with ad-hoc Playwright
scripts in the scratchpad directory (not committed to the repo), run against
the local dev servers (`npm run dev` in both `client/` and `server/`, plus a
local Postgres instance). This sandbox's network policy blocks external
hosts (Open-Meteo, Google, Gemini, etc.), so weather/style-guide checks that
need real network calls are mocked via Playwright's `page.route()`; the
Gemini try-on flow is tested via its graceful-degradation path (no
`GEMINI_API_KEY` set locally) rather than a real generation call.

**Known flaky (not a real bug):** the style-guide Playwright check
occasionally times out waiting on "Researching style tips…" — confirmed via
isolated debugging to be a one-off timing flake, not a real bug. If it fails
once, rerun before investigating further.

## Notes for whoever (whatever session) picks this up next

- Check `git log --oneline` for the full commit history — every completed
  feature is its own commit with a descriptive message.
- Check the task list (TaskCreate/TaskUpdate tool) for granular in-flight
  work if a feature was left mid-build.
- The user's app is live in production on Render + Supabase — the user can
  confirm it's still working by visiting their `.onrender.com` client URL.
- `todo-demo/` in the repo root is an unrelated earlier throwaway project,
  not part of PackRat.
