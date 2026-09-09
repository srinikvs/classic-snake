import { existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const devHtml = resolve(process.cwd(), "index.dev.html");

export default defineConfig({
  base: "/classic-snake/",
  plugins: [
    react(),
    {
      name: "emit-index-html",
      closeBundle() {
        const from = resolve("dist/index.dev.html");
        const to = resolve("dist/index.html");
        if (existsSync(from)) renameSync(from, to);
      },
    },
  ],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    rollupOptions: {
      input: existsSync(devHtml) ? devHtml : resolve(process.cwd(), "index.html"),
    },
  },
});
