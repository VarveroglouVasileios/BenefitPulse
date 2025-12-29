import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
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
