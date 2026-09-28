import { brandingFromSettings } from "./storage.js";

export const PWA_THEME_COLOR = "#1565d8";
export const PWA_BACKGROUND_COLOR = "#f4f6f9";

/** Web App Manifest JSON using the church logo from settings. */
export function buildWebAppManifest(settings, req) {
  const branding = brandingFromSettings(settings, req);
  const icon = branding.logoUrl;
  const icons = icon
    ? [
        { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: icon, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ]
    : [];

  const name = branding.name || "Christ Embassy Airport City Jesus Brand";
  const shortName = name.length > 24 ? `${name.slice(0, 21)}…` : name;

  return {
    id: "/",
    name,
    short_name: shortName,
    description: branding.tagline || "Local Church Management System",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: PWA_BACKGROUND_COLOR,
    theme_color: PWA_THEME_COLOR,
    categories: ["productivity", "social"],
    icons,
  };
}
