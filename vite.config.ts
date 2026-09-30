import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
const appBuildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || new Date().toISOString();

export default defineConfig(({ mode }) => ({
  define: {
    "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(appBuildId),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/manifest.webmanifest": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: false,
      workbox: {
        importScripts: ["sw-handlers.js"],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/manifest\.webmanifest$/],
        // External font CDN caching often triggers Cache.put() network errors on flaky links.
        runtimeCaching: [],
      },
      // Service worker in dev caches /node_modules/.vite/deps and causes 504 Outdated Optimize Dep.
      devOptions: {
        enabled: process.env.VITE_PWA_DEV === "true",
        navigateFallback: "index.html",
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
