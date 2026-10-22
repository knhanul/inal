import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const origin = process.env.WEATHER_ORIGIN || "https://weather.nuni.co.kr";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    proxy: {
      "/weather": {
        target: origin,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/weather/, ""),
      },
    },
  },
});
