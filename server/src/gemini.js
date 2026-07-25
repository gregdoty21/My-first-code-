import fs from "node:fs";
import path from "node:path";
import { uploadsDir } from "./storage.js";

// Virtual try-on via Google's Gemini 2.5 Flash Image ("Nano Banana") model —
// the only mainstream model that can take two photos (a person + a garment)
// and return a new *edited* photo, rather than just describing one. Priced
// per output image (~$0.039 at the time this was written), so every call
// costs real money — this file is the single place that talks to Google so
// that cost surface stays easy to find.

const MODEL = "gemini-2.5-flash-image";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const FETCH_TIMEOUT_MS = 30000;

export const tryOnConfigured = Boolean(process.env.GEMINI_API_KEY);

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Loads image bytes for a path/URL produced by storage.js (either a full
// Supabase public URL or a same-origin "/uploads/..." path) and returns them
// as inline base64 data suitable for Gemini's `inline_data` field.
export async function loadImageAsBase64(pathOrUrl) {
  let res;
  if (/^https?:\/\//.test(pathOrUrl)) {
    res = await fetchWithTimeout(pathOrUrl);
  } else {
    const filePath = path.join(uploadsDir, path.basename(pathOrUrl));
    const buffer = await fs.promises.readFile(filePath);
    return { base64: buffer.toString("base64"), mimeType: mimeFromExt(filePath) };
  }
  if (!res.ok) throw new Error(`Could not load image (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || mimeFromExt(pathOrUrl);
  return { base64: buffer.toString("base64"), mimeType };
}

function mimeFromExt(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

// Sends the person photo + the wardrobe item photo to Gemini with an editing
// prompt and returns the generated image as a buffer. Throws if the model
// doesn't return an image (e.g. it refused, or only returned text).
export async function generateTryOn({ personImage, itemImage, itemName }) {
  if (!tryOnConfigured) {
    throw new Error("Virtual try-on isn't configured (missing GEMINI_API_KEY)");
  }

  const prompt =
    `Edit the first photo (a person) so they are wearing the clothing item shown in the ` +
    `second photo ("${itemName}"). Keep the person's face, body shape, pose, and the ` +
    `background of the first photo unchanged. Fit the garment naturally with realistic ` +
    `fabric folds, shadows, and lighting that match the original photo. Only change the ` +
    `clothing being tried on.`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: personImage.mimeType, data: personImage.base64 } },
          { inline_data: { mime_type: itemImage.mimeType, data: itemImage.base64 } },
        ],
      },
    ],
  };

  const res = await fetchWithTimeout(
    `${API_BASE}/${MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inline_data || p.inlineData);
  if (!imagePart) {
    const textPart = parts.find((p) => p.text)?.text;
    throw new Error(textPart ? `Model didn't return an image: ${textPart.slice(0, 200)}` : "Model didn't return an image");
  }

  const inline = imagePart.inline_data || imagePart.inlineData;
  const mimeType = inline.mime_type || inline.mimeType || "image/png";
  const buffer = Buffer.from(inline.data, "base64");
  return { buffer, mimeType };
}
