/** Public app URL — set APP_URL in production (Vercel, Render, etc.). */
export function getAppUrl() {
  const vercel =
    process.env.VERCEL_URL && !process.env.VERCEL_URL.startsWith("http")
      ? `https://${process.env.VERCEL_URL}`
      : process.env.VERCEL_URL;
  return (
    process.env.APP_URL ||
    vercel ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:8080"
  );
}
