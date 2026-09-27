import fs from "fs";

import path from "path";

import { fileURLToPath } from "url";

import { getAppUrl } from "./app-url.js";

import { getSupabaseAdminClient } from "./supabase.js";



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");



let bucketListCache = null;



function safeName(name) {

  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

}



function normalizeBucketKey(name) {

  return String(name || "")

    .toLowerCase()

    .replace(/[\s_]+/g, "-")

    .replace(/[^a-z0-9-]/g, "");

}



async function listStorageBuckets(admin) {

  if (bucketListCache) return bucketListCache;

  const { data: buckets, error } = await admin.storage.listBuckets();

  if (error) throw error;

  bucketListCache = buckets || [];

  return bucketListCache;

}



/**

 * Map upload folder (logos, media, avatars, banners, …) to an existing Supabase bucket.

 * Buckets: church-logos, member-avatars, event-banners, church-media (media library).

 */

export async function resolveStorageBucket(admin, folder) {

  const f = String(folder || "").toLowerCase();



  const envByPurpose = {

    logos: process.env.SUPABASE_BUCKET_CHURCH_LOGOS,

    avatars: process.env.SUPABASE_BUCKET_MEMBER_AVATARS,

    banners: process.env.SUPABASE_BUCKET_EVENT_BANNERS,

    media: process.env.SUPABASE_BUCKET_MEDIA || "church-media",

  };



  let purpose = "logos";

  if (f.includes("logo")) purpose = "logos";

  else if (f.includes("avatar")) purpose = "avatars";

  else if (f.includes("banner")) purpose = "banners";

  else if (f === "media" || f.includes("media") || f.includes("sermon") || f.includes("audio")) purpose = "media";



  const fromEnv = envByPurpose[purpose]?.trim();

  if (fromEnv) return fromEnv;



  const buckets = await listStorageBuckets(admin);

  const keys = buckets.map((b) => ({ id: b.name, norm: normalizeBucketKey(b.name) }));



  const pick = (test) => keys.find((b) => test(b.norm))?.id || null;



  if (purpose === "logos") {

    return (
      pick((n) => n.includes("logo")) ||
      pick((n) => n.includes("church") && !n.includes("avatar") && !n.includes("media"))
    );

  }

  if (purpose === "avatars") {

    return pick((n) => n.includes("avatar")) || pick((n) => n.includes("member"));

  }

  if (purpose === "banners") {

    return pick((n) => n.includes("banner")) || pick((n) => n.includes("event"));

  }

  if (purpose === "media") {

    return pick((n) => n.includes("media"));

  }



  return null;

}



/** Upload a local file; returns public URL (Supabase Storage when a bucket matches, else /uploads). */

export async function persistUploadedFile(localPath, folder, originalName, mimeType) {

  const admin = getSupabaseAdminClient();

  if (admin && process.env.USE_SUPABASE_STORAGE === "true") {

    try {

      const bucket = await resolveStorageBucket(admin, folder);

      if (!bucket) {

        if (String(folder || "").toLowerCase().includes("media")) {

          console.info(

            "No Supabase media bucket configured — saving sermon/media files under /uploads (church logos, avatars, and event banners use Storage)."

          );

        } else {

          console.warn(

            `No Supabase bucket matched folder "${folder}" — using local /uploads. Set SUPABASE_BUCKET_* in .env if needed.`

          );

        }

      } else {

        const objectPath = `${folder}/${Date.now()}-${safeName(originalName || path.basename(localPath))}`;

        const buffer = fs.readFileSync(localPath);

        const { error } = await admin.storage.from(bucket).upload(objectPath, buffer, {

          upsert: true,

          contentType: mimeType || "application/octet-stream",

        });

        if (error) throw error;

        const { data } = admin.storage.from(bucket).getPublicUrl(objectPath);

        try {

          fs.unlinkSync(localPath);

        } catch {

          /* ignore */

        }

        return data.publicUrl;

      }

    } catch (err) {

      console.warn(

        "Supabase Storage upload failed, using local uploads folder:",

        err instanceof Error ? err.message : err

      );

    }

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



function localUploadRelPath(basename) {

  if (!basename) return null;

  const full = path.join(UPLOAD_DIR, basename);

  if (!fs.existsSync(full)) return null;

  return `/uploads/${basename}`;

}



/** If settings point at an external URL, use a matching file in uploads/ when present. */

export function findLocalLogoForExternalUrl(externalUrl) {

  if (!externalUrl || !fs.existsSync(UPLOAD_DIR)) return null;

  try {

    for (const file of fs.readdirSync(UPLOAD_DIR)) {

      const recovered = recoverUrlFromMangledFilename(file);

      if (recovered === externalUrl) return localUploadRelPath(file);

    }

  } catch {

    return null;

  }

  return null;

}



/** Normalize logo URL for API responses — prefer local uploads over blocked external CDNs. */

export function normalizeLogoUrl(url, req) {

  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  if (!trimmed) return null;



  const basename = path.basename(trimmed.replace(/\\/g, "/"));



  const directLocal = localUploadRelPath(basename);

  if (directLocal) return resolveAssetUrl(directLocal, req);



  if (trimmed.startsWith("/uploads/")) {

    const recovered = recoverUrlFromMangledFilename(basename);

    const matched = recovered ? findLocalLogoForExternalUrl(recovered) : null;

    if (matched) return resolveAssetUrl(matched, req);

    if (recovered) return recovered;

    return resolveAssetUrl(trimmed, req);

  }



  if (isExternalUrl(trimmed)) {

    const matched = findLocalLogoForExternalUrl(trimmed);

    if (matched) return resolveAssetUrl(matched, req);

    return trimmed;

  }



  if (/https?___/i.test(basename)) {

    const recovered = recoverUrlFromMangledFilename(basename);

    if (recovered && isExternalUrl(recovered)) {

      const matched = findLocalLogoForExternalUrl(recovered);

      if (matched) return resolveAssetUrl(matched, req);

      return recovered;

    }

  }



  return resolveAssetUrl(trimmed, req);

}



/** Normalize logo URL before saving to the database. */

export function normalizeLogoUrlForStorage(url) {

  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  if (!trimmed) return null;



  const basename = path.basename(trimmed.replace(/\\/g, "/"));

  const directLocal = localUploadRelPath(basename);

  if (directLocal) return directLocal;



  if (isExternalUrl(trimmed)) {

    const matched = findLocalLogoForExternalUrl(trimmed);

    if (matched) return matched;

    return trimmed;

  }



  if (/https?___/i.test(basename)) {

    const recovered = recoverUrlFromMangledFilename(basename);

    if (recovered && isExternalUrl(recovered)) {

      const matched = findLocalLogoForExternalUrl(recovered);

      if (matched) return matched;

      return recovered;

    }

  }



  if (trimmed.startsWith("/uploads/")) {

    if (!localUploadRelPath(basename)) return null;

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


