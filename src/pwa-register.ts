import { registerSW } from "virtual:pwa-register";

/** Production PWA — auto-update with safe registration error logging. */
export function registerAppServiceWorker() {
  if (!import.meta.env.PROD) return;

  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.warn("[CEYC CMS] Service worker registration failed:", error);
    },
  });
}
