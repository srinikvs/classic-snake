import { cpSync, copyFileSync, rmSync, existsSync } from "node:fs";

if (!existsSync("dist/index.html")) {
  console.error("dist/index.html missing — run vite build first");
  process.exit(1);
}

copyFileSync("dist/index.html", "index.html");
if (existsSync("assets")) rmSync("assets", { recursive: true, force: true });
cpSync("dist/assets", "assets", { recursive: true });
if (existsSync("dist/favicon.svg")) copyFileSync("dist/favicon.svg", "favicon.svg");
if (existsSync("dist/_redirects")) copyFileSync("dist/_redirects", "_redirects");
console.log("Promoted dist/ → repo root (index.html + assets/) for Playadda /classic-snake/");
