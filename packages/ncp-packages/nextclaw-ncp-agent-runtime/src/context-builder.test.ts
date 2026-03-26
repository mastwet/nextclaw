import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { LocalAttachmentStore } from "./attachment-store.js";
import { DefaultNcpContextBuilder } from "./context-builder.js";

const tempDirs: string[] = [];

function createAttachmentStore(): LocalAttachmentStore {
  const rootDir = mkdtempSync(join(tmpdir(), "nextclaw-ncp-context-builder-test-"));
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

describe("DefaultNcpContextBuilder", () => {
  it("converts user image file parts into OpenAI multimodal content", () => {
    const builder = new DefaultNcpContextBuilder();
    const prepared = builder.prepare({
      sessionId: "session-1",
      messages: [
        {
          id: "user-1",
          sessionId: "session-1",
          role: "user",
          status: "final",
          timestamp: "2026-03-25T12:00:00.000Z",
          parts: [
            { type: "text", text: "describe this" },
            {
              type: "file",
              mimeType: "image/png",
              contentBase64: "ZmFrZS1pbWFnZQ==",
              sizeBytes: 12,
            },
          ],
        },
      ],
    });

    expect(prepared.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "describe this" },
          {
            type: "image_url",
            image_url: {
              url: "data:image/png;base64,ZmFrZS1pbWFnZQ==",
            },
          },
        ],
      },
    ]);
  });

  it("injects uploaded text-like attachments into user content", async () => {
    const attachmentStore = createAttachmentStore();
    const record = await attachmentStore.saveAttachment({
      fileName: "config.json",
      mimeType: "application/json",
      bytes: Buffer.from('{"feature":"enabled"}', "utf8"),
    });
    const builder = new DefaultNcpContextBuilder({
      attachmentStore,
    });

    const prepared = builder.prepare({
      sessionId: "session-1",
      messages: [
        {
          id: "user-2",
          sessionId: "session-1",
          role: "user",
          status: "final",
          timestamp: "2026-03-25T12:00:00.000Z",
          parts: [
            { type: "text", text: "read this file" },
            {
              type: "file",
              name: "config.json",
              mimeType: "application/json",
              attachmentUri: record.uri,
              sizeBytes: record.sizeBytes,
            },
          ],
        },
      ],
    });

    expect(prepared.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "read this file" },
          {
            type: "text",
            text: '[Attachment: config.json]\n[MIME: application/json]\n{"feature":"enabled"}',
          },
        ],
      },
    ]);
  });
});
