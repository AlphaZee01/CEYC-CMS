import { publicApi } from "@/lib/api";

export interface ChurchBranding {
  name: string;
  tagline?: string;
  logoUrl?: string;
}

const CACHE_KEY = "celcm_branding";

export const DEFAULT_BRANDING: ChurchBranding = {
  name: "Christ Embassy",
  tagline: "Local Church Management System",
};

export function getCachedBranding(): ChurchBranding {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_BRANDING;
    return { ...DEFAULT_BRANDING, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function cacheBranding(branding: ChurchBranding) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(branding));
  } catch {
    /* ignore quota errors */
  }
}

export async function fetchPublicBranding(): Promise<ChurchBranding> {
  const b = await publicApi<{ name: string; tagline: string; logoUrl: string | null }>("/public/branding");
  const branding: ChurchBranding = {
    name: b.name,
    tagline: b.tagline,
    logoUrl: b.logoUrl || undefined,
  };
  cacheBranding(branding);
  return branding;
}
