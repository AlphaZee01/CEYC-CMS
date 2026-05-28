import type { ChurchBranding } from "@/lib/branding";
import { DEFAULT_BRANDING } from "@/lib/branding";

export const PWA_THEME_COLOR = "#1565d8";

function upsertMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertMetaProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  const selector = rel === "icon" ? 'link[rel="icon"]' : `link[rel="${rel}"]`;
  let el = document.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Sync document title, PWA meta tags, and favicon from church branding (logo from settings). */
export function applyWebAppBranding(branding: ChurchBranding) {
  const name = branding.name || DEFAULT_BRANDING.name;
  const tagline = branding.tagline || DEFAULT_BRANDING.tagline || "Local Church Management";
  const title = `${name} — ${tagline}`;

  document.title = title;
  upsertMeta("description", `${name} — ${tagline}`);
  upsertMeta("author", name);
  upsertMeta("theme-color", PWA_THEME_COLOR);
  upsertMeta("apple-mobile-web-app-title", name);
  upsertMetaProperty("og:title", title);
  upsertMetaProperty("og:description", tagline);

  if (branding.logoUrl) {
    upsertLink("icon", branding.logoUrl);
    upsertLink("apple-touch-icon", branding.logoUrl);
    upsertMetaProperty("og:image", branding.logoUrl);
    upsertMeta("twitter:image", branding.logoUrl);
  }
}
