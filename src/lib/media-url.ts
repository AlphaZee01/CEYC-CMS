/** Extract Google Drive file id from common share URL formats. */
export function extractGoogleDriveFileId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const byPath = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath) return byPath[1];
  const byQuery = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (byQuery) return byQuery[1];
  return null;
}

export function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com/i.test(url.trim());
}

/** Normalize share URL; returns canonical share link or null if invalid. */
export function normalizeGoogleDriveUrl(url: string): string | null {
  const id = extractGoogleDriveFileId(url);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/view`;
}

/** Embed URL for in-app playback (Google Drive preview player). */
export function googleDriveEmbedUrl(url: string): string | null {
  const id = extractGoogleDriveFileId(url);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
}

export function getMediaEmbedUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  if (isGoogleDriveUrl(fileUrl)) return googleDriveEmbedUrl(fileUrl);
  return null;
}

export function getMediaOpenUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;
  if (isGoogleDriveUrl(fileUrl)) return normalizeGoogleDriveUrl(fileUrl) || fileUrl;
  return fileUrl;
}
