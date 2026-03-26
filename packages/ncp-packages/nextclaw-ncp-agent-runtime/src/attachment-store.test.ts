import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { LocalAttachmentStore } from "./attachment-store.js";

const tempDirs: string[] = [];

function createStore(): LocalAttachmentStore {
  const rootDir = mkdtempSync(join(tmpdir(), "nextclaw-attachment-store-test-"));
  tempDirs.push(rootDir);
  return new LocalAttachmentStore({ rootDir });
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("LocalAttachmentStore", () => {
  it("preserves the original file name while storing a sanitized file name on disk", async () => {
    const store = createStore();
    const record = await store.saveAttachment({
      fileName: "my config.json",
      mimeType: "application/json",
      bytes: Buffer.from('{"ok":true}', "utf8"),
    });

    expect(record.originalName).toBe("my config.json");
    expect(record.storedName).toBe("my_config.json");
    expect(store.resolveContentPath(record.uri)).toContain("my_config.json");
  });
});
