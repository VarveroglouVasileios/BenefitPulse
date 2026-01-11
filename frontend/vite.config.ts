import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.svg"],
      manifest: {
        name: "BenefitPulse",
        short_name: "BenefitPulse",
        description: "Ενημερώσου για όλα τα επιδόματα και προγράμματα",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "logo.svg",
            sizes: "any",
            type: "image/svg+xml"
          }
        ]
      },
      workbox: {
        importScripts: ["/push-sw.js"],
        cleanupOutdatedCaches: true
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../shared/src"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".vue", ".json"],
  },
  optimizeDeps: {
    include: ["zod"],
    exclude: [],
  },
  server: {
    port: 5173,
    host: "0.0.0.0", // Allow external connections (needed for Cloudflare tunnels)
    strictPort: false,
    // Allow Cloudflare tunnel domains
    allowedHosts: [
      "localhost",
      ".trycloudflare.com", // Wildcard for all Cloudflare tunnel subdomains
    ],
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
