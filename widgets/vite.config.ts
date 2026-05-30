import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    base: mode === "production" ? "./" : undefined,
    build: {
      outDir: "../server/dist",
      emptyOutDir: true,
    },
  };
});
