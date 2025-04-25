import node from "@astrojs/node";
import { defineConfig } from "astro/config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  site: "http://localhost:4321",
  output: "server",
  adapter: node({
    mode: "standalone",
    polyfill: true
  }),
  vite: {
    plugins: [nodePolyfills()],
    optimizeDeps: {
      include: ["buffer", "util"]
    }
  }
});