import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  outDir: "dist",
  bundle: true,
  external: ["@nextclaw/core"],
  target: "es2022",
  clean: true,
});
