import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.join(__dirname, "..", "uploads");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "photos";

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

if (!supabase) {
  // Local-disk fallback for dev, and for anyone running this without a
  // Supabase account — but a typical free host wipes this disk on every
  // restart/redeploy, which is exactly why production should set
  // SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const usingCloudStorage = Boolean(supabase);

// Creates the Storage bucket on first boot if it doesn't exist yet, so a
// fresh Supabase project works without any manual dashboard steps beyond
// creating the project and setting the env vars.
export async function ensureBucket() {
  if (!supabase) return;
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;
    if (buckets?.some((b) => b.name === SUPABASE_BUCKET)) return;
    const { error: createError } = await supabase.storage.createBucket(SUPABASE_BUCKET, { public: true });
    if (createError) throw createError;
    console.log(`Created Supabase Storage bucket "${SUPABASE_BUCKET}"`);
  } catch (err) {
    console.error(
      `Could not verify/create Supabase Storage bucket "${SUPABASE_BUCKET}" — create it manually in the Supabase dashboard (Storage > New bucket, public) if uploads fail:`,
      err.message
    );
  }
}

function extFor(mimetype, originalname) {
  const ext = path.extname(originalname || "").toLowerCase();
  return ext || `.${(mimetype || "").split("/")[1] || "jpg"}`;
}

// Returns a URL/path suitable for storing in the DB and rendering directly
// in an <img src>: a full public URL when using Supabase Storage, or a
// same-origin "/uploads/<name>" path when using local disk.
export async function saveFile(buffer, originalname, mimetype) {
  const filename = `${crypto.randomUUID()}${extFor(mimetype, originalname)}`;

  if (supabase) {
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(filename, buffer, { contentType: mimetype, upsert: false });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(filename);
    return data.publicUrl;
  }

  await fs.promises.writeFile(path.join(uploadsDir, filename), buffer);
  return `/uploads/${filename}`;
}

export async function deleteFile(pathOrUrl) {
  if (!pathOrUrl) return;

  if (supabase && /^https?:\/\//.test(pathOrUrl)) {
    const filename = pathOrUrl.split("/").pop();
    await supabase.storage.from(SUPABASE_BUCKET).remove([filename]).catch(() => {});
    return;
  }

  if (pathOrUrl.startsWith("/uploads/")) {
    await fs.promises.unlink(path.join(uploadsDir, path.basename(pathOrUrl))).catch(() => {});
  }
}
