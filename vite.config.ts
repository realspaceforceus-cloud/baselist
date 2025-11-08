import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "a3e1b177-81ad-44bd-98fb-fc8774046892-00-g1v52ts7fvpr.janeway.replit.dev",
    ],
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
    cssMinify: "esbuild",
    sourcemap: true, // Enable for debugging crashes
    chunkSizeWarningLimit: 1600,
  },
  css: {
    transformer: "postcss",
  },
  plugins: command === "serve" ? [react(), expressPlugin()] : [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      // Lazy import to avoid loading server dependencies during build
      const { createServer } = await import("./server");
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
