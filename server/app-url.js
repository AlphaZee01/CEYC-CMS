/** Public app URL — Render sets RENDER_EXTERNAL_URL automatically on Web Services. */
export function getAppUrl() {
  return (
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:8080"
  );
}
