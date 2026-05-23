import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = env.VITE_BACKEND_URL || "http://localhost:3000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": { target: backendUrl, changeOrigin: true },
        "/auth": { target: backendUrl, changeOrigin: true },
        "/invoice": { target: backendUrl, changeOrigin: true },
        "/action": { target: backendUrl, changeOrigin: true },
        "/csv": { target: backendUrl, changeOrigin: true },
        "/report": { target: backendUrl, changeOrigin: true },
      },
    },
  };
});
