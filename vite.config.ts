/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    // Installable PWA: the app shell is cached so site screens open offline.
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // public/manifest.webmanifest
      includeAssets: ["favicon.ico", "favicon.png", "apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png", "maskable-512x512.png"],
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/auth\//, /^\/rest\//, /^\/storage\//],
        globPatterns: ["**/*.{js,css,html,png,ico,webmanifest,svg}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-checkbox", "@radix-ui/react-label", "lucide-react", "sonner"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          data: ["@tanstack/react-query", "i18next", "react-i18next"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
