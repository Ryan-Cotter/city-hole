import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        game: "index.html",
        models: "models.html",
        polish: "polish.html",
      },
      output: {
        manualChunks: {
          three: ["three"],
        },
      },
    },
  },
});
