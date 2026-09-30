/** Fast responses for Vercel cold start — no Express / Postgres import. */

function churchName() {
  return process.env.CHURCH_NAME || "Christ Embassy Airport City Jesus Brand";
}

function useSupabaseAuth() {
  if (process.env.USE_SUPABASE_AUTH === "false") return false;
  return (
    process.env.USE_SUPABASE_AUTH === "true" &&
    !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  );
}

export function matchLightPublicPath(url) {
  const path = (url || "").split("?")[0];
  if (path === "/api/public/config" || path === "/public/config") return "config";
  if (path === "/api/public/branding" || path === "/public/branding") return "branding";
  if (path === "/api/health" || path === "/health") return "health";
  if (path === "/manifest.webmanifest") return "manifest";
  return null;
}

export function handleLightPublic(kind, req, res) {
  if (kind === "config") {
    res.setHeader("Content-Type", "application/json");
    res.status(200).end(JSON.stringify({ authMode: useSupabaseAuth() ? "supabase" : "jwt" }));
    return true;
  }
  if (kind === "branding") {
    const name = churchName();
    res.setHeader("Content-Type", "application/json");
    res.status(200).end(
      JSON.stringify({
        name,
        tagline: "Local Church Management System",
        logoUrl: null,
      })
    );
    return true;
  }
  if (kind === "health") {
    res.setHeader("Content-Type", "application/json");
    res.status(200).end(
      JSON.stringify({
        ok: false,
        database: "starting",
        storage: process.env.USE_SUPABASE_STORAGE === "true" ? "supabase" : "local",
        note: "Full API still bootstrapping on cold start",
      })
    );
    return true;
  }
  if (kind === "manifest") {
    const name = churchName();
    const shortName = name.length > 24 ? `${name.slice(0, 21)}…` : name;
    res.setHeader("Content-Type", "application/manifest+json");
    res.status(200).end(
      JSON.stringify({
        id: "/",
        name,
        short_name: shortName,
        description: "Local Church Management System",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#1565d8",
        background_color: "#f4f6f9",
        icons: [],
      })
    );
    return true;
  }
  return false;
}
