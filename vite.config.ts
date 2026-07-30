import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // GitHub Pages project site: https://<user>.github.io/typing-test/
  base: process.env.GITHUB_ACTIONS === "true" ? "/typing-test/" : "/",
  plugins: [tailwindcss()],
});
