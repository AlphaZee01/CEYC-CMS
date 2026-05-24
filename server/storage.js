import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAppUrl } from "./app-url.js";
import { getSupabaseAdminClient } from "./supabase.js";
import { usePostgres } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
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

/** Recover https URL accidentally saved as an upload filename (https___host_path.ext). */
export function recoverUrlFromMangledFilename(filename) {
  const base = path.basename(filename);
  const match = base.match(/https?___(.+)\.(png|jpe?g|gif|webp|svg)$/i);
  if (!match) return null;
  const domainMatch = match[1].match(/^([a-z0-9.-]+\.[a-z]{2,})_(.+)$/i);
  if (domainMatch) {
    const pathPart = domainMatch[2].replace(/_/g, "/");
    return `https://${domainMatch[1]}/${pathPart}.${match[2]}`;
  }
  return `https://${match[1].replace(/_/g, "/")}.${match[2]}`;
}

/** Normalize logo URL for API responses — skip missing uploads, recover mangled external URLs. */
export function normalizeLogoUrl(url, req) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (isExternalUrl(trimmed)) return trimmed;

  const basename = path.basename(trimmed.replace(/\\/g, "/"));
  if (/https?___/i.test(basename)) {
    const recovered = recoverUrlFromMangledFilename(basename);
    if (recovered && isExternalUrl(recovered)) return recovered;
  }

  if (trimmed.startsWith("/uploads/")) {
    const localPath = path.join(UPLOAD_DIR, basename);
    if (!fs.existsSync(localPath)) {
      const recovered = recoverUrlFromMangledFilename(basename);
      if (recovered) return recovered;
      return null;
    }
  }

  return resolveAssetUrl(trimmed, req);
}

/** Normalize logo URL before saving to the database. */
export function normalizeLogoUrlForStorage(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (isExternalUrl(trimmed)) return trimmed;

  const basename = path.basename(trimmed.replace(/\\/g, "/"));
  if (/https?___/i.test(basename)) {
    const recovered = recoverUrlFromMangledFilename(basename);
    if (recovered && isExternalUrl(recovered)) return recovered;
  }

  if (trimmed.startsWith("/uploads/")) {
    const localPath = path.join(UPLOAD_DIR, basename);
    if (!fs.existsSync(localPath)) return null;
  }

  return trimmed;
}

/** Ensure logo/upload URLs work on mobile and production (absolute when relative). */
export function resolveAssetUrl(url, req) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (isExternalUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) {
    const host = req?.get?.("host");
    if (host) {
      const proto = req.get("x-forwarded-proto") || req.protocol || "https";
      return `${proto}://${host}${trimmed}`;
    }
    return `${getAppUrl().replace(/\/$/, "")}${trimmed}`;
  }
  return trimmed;
}

export function brandingFromSettings(settings, req) {
  return {
    name: settings?.name || "Christ Embassy",
    tagline: settings?.tagline || "Local Church Management System",
    logoUrl: normalizeLogoUrl(settings?.logo_url, req),
  };
}
