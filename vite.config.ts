import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ofative/supabase-client": path.resolve(__dirname, "./packages/supabase-client/src"),
      "@ofative/shared-types": path.resolve(__dirname, "./packages/shared-types/src"),
      "@ofative/ui": path.resolve(__dirname, "./packages/ui"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://187.77.154.212:8001",
        changeOrigin: true,
      },
    },
  },
});
