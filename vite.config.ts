import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "src/renderer"),
  build: {
    // Ensure asset paths work when loaded via file:// in Electron
    assetsDir: "assets",
    rollupOptions: {},
    outDir: path.resolve(__dirname, "app/renderer"),
    emptyOutDir: true,
  },
  base: "./",
  server: {
    port: 5173,
  },
});
