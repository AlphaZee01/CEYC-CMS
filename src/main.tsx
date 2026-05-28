import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getCachedBranding } from "@/lib/branding";
import { applyWebAppBranding } from "@/lib/web-app-branding";

applyWebAppBranding(getCachedBranding());

createRoot(document.getElementById("root")!).render(<App />);
