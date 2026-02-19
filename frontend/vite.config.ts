import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const disableHmr = process.env.VITE_DISABLE_HMR === "1";
const usePolling = process.env.VITE_USE_POLLING !== "0";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  appType: "custom",
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    hmr: disableHmr ? false : undefined,
    watch: {
      usePolling,
      interval: 300,
    },
  },
});
