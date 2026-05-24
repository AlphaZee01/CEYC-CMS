import fs from "fs";
import path from "path";
import { getSupabaseAdminClient } from "./supabase.js";
import { usePostgres } from "./store.js";

const BUCKET = "church-assets";

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

async function ensureBucket(admin) {
  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) throw listErr;
  if (buckets?.some((b) => b.name === BUCKET)) return;
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 104857600,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

/** Upload a local file; returns public URL (Supabase Storage on production, /uploads locally). */
export async function persistUploadedFile(localPath, folder, originalName, mimeType) {
  const admin = getSupabaseAdminClient();
  if (admin && usePostgres) {
    await ensureBucket(admin);
    const objectPath = `${folder}/${Date.now()}-${safeName(originalName || path.basename(localPath))}`;
    const buffer = fs.readFileSync(localPath);
    const { error } = await admin.storage.from(BUCKET).upload(objectPath, buffer, {
      upsert: true,
      contentType: mimeType || "application/octet-stream",
    });
    if (error) throw error;
    const { data } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
    try {
      fs.unlinkSync(localPath);
    } catch {
      /* ignore */
    }
    return data.publicUrl;
  }
  return `/uploads/${path.basename(localPath)}`;
}

export function isExternalUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}
