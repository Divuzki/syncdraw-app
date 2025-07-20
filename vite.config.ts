import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: [],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
      buffer: "buffer",
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  define: {
    global: "globalThis",
    "process.env": {},
    Buffer: ["buffer", "Buffer"],
  },
  optimizeDeps: {
    include: ["buffer"],
  },
});
