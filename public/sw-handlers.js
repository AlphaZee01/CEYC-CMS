/* Loaded by Workbox-generated sw.js — log cache/network failures without breaking the app shell. */
self.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason && (reason.message || String(reason));
  if (message && /cache|network|fetch/i.test(message)) {
    console.warn("[CEYC CMS SW] Non-fatal cache/network error:", message);
    event.preventDefault();
  }
});
