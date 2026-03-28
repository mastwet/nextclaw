import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type PackageManifest = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function readPackageManifest(): PackageManifest {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const manifestPath = resolve(currentDir, "../package.json");
  return JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
}

describe("openclaw compat package manifest", () => {
  it("keeps the host core singleton out of runtime dependencies", () => {
    const manifest = readPackageManifest();

    expect(manifest.dependencies).not.toHaveProperty("@nextclaw/core");

    expect(manifest.peerDependencies).toMatchObject({
      "@nextclaw/core": "workspace:*",
    });
    expect(manifest.devDependencies).toMatchObject({
      "@nextclaw/core": "workspace:*",
    });
  });
});
