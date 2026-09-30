import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getCachedBranding } from "@/lib/branding";
import { applyWebAppBranding } from "@/lib/web-app-branding";

applyWebAppBranding(getCachedBranding());

if (import.meta.env.PROD) {
  console.info("[CEYC CMS] client build", import.meta.env.VITE_APP_BUILD_ID ?? "unknown");
}

createRoot(document.getElementById("root")!).render(<App />);
