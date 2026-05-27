export function extractGoogleDriveFileId(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return null;
  const byPath = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (byPath) return byPath[1];
  const byQuery = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (byQuery) return byQuery[1];
  return null;
}

export function isGoogleDriveUrl(url) {
  return /drive\.google\.com/i.test(String(url || "").trim());
}

export function normalizeGoogleDriveUrl(url) {
  const id = extractGoogleDriveFileId(url);
  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/view`;
}
