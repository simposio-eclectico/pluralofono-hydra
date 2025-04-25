import fs from 'fs';
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  envDir: "..",
  // root: resolve(__dirname, "src"),
  // build: {
  //   emptyOutDir: true,
  //   outDir: resolve(__dirname, "public"),
  //   rollupOptions: {
  //     input: {
  //       main: resolve(__dirname, "src/index.html"),
  //     },
  //   },
  // },
  server: {
    watch: "src",
    https: {
      key: fs.readFileSync('.cert/key.pem'),
      cert: fs.readFileSync('.cert/cert.pem'),
    },
    host: 'localhost'
  },
  plugins: [nodePolyfills()],
});
