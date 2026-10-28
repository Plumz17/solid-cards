import { defineConfig } from "vite";

// The GitHub Pages workflow sets GITHUB_PAGES so assets resolve under /solid-cards/.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/solid-cards/" : "/",
});
