import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ATTACHMENT_URI_SCHEME = "attachment://local/";

export type StoredAttachmentRecord = {
  id: string;
  uri: string;
  storageKey: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  sha256: string;
};

export type SaveAttachmentParams = {
  fileName: string;
  mimeType?: string | null;
  bytes: Uint8Array;
  createdAt?: Date;
};

export type AttachmentTextSnapshot = {
  text: string;
  truncated: boolean;
  record: StoredAttachmentRecord;
};

function normalizeSegment(value: string): string {
  return value.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "attachment.bin";
}

function normalizeOriginalName(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "attachment.bin";
}

function normalizeMimeType(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : "application/octet-stream";
}

function buildAttachmentId(): string {
  return `att_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}

function ensureAttachmentRoot(rootDir: string): string {
  const normalized = rootDir.trim();
  if (!normalized) {
    throw new Error("LocalAttachmentStore requires a non-empty rootDir.");
  }
  return resolve(normalized);
}

function buildStorageKey(timestamp: Date, attachmentId: string): string {
  const year = String(timestamp.getFullYear());
  const month = String(timestamp.getMonth() + 1).padStart(2, "0");
  const day = String(timestamp.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}/${attachmentId}`;
}

function buildAttachmentUri(storageKey: string): string {
  return `${ATTACHMENT_URI_SCHEME}${storageKey}`;
}

function parseAttachmentUri(uri: string): string | null {
  const normalized = uri.trim();
  if (!normalized.startsWith(ATTACHMENT_URI_SCHEME)) {
    return null;
  }
  const storageKey = normalized.slice(ATTACHMENT_URI_SCHEME.length).replace(/^\/+/, "").trim();
  return storageKey.length > 0 ? storageKey : null;
}

function ensureStorageKey(storageKey: string): string {
  const normalized = storageKey.trim().replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    throw new Error("Attachment storage key must not be empty.");
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Invalid attachment storage key: ${storageKey}`);
  }
  return segments.join("/");
}

function hydrateStoredAttachmentRecord(value: StoredAttachmentRecord): StoredAttachmentRecord {
  const originalName = normalizeOriginalName(value.originalName);
  return {
    ...value,
    originalName,
    storedName: normalizeSegment(value.storedName || originalName),
    mimeType: normalizeMimeType(value.mimeType),
  };
}

export function isTextLikeAttachment(params: { mimeType?: string | null; fileName?: string | null }): boolean {
  const mimeType = normalizeMimeType(params.mimeType);
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "text/xml" ||
    mimeType === "application/yaml" ||
    mimeType === "text/yaml" ||
    mimeType === "application/x-yaml" ||
    mimeType === "text/csv"
  ) {
    return true;
  }

  const normalizedName = (params.fileName ?? "").trim().toLowerCase();
  return [
    ".json",
    ".md",
    ".txt",
    ".csv",
    ".xml",
    ".yaml",
    ".yml",
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".py",
    ".rb",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".swift",
    ".php",
    ".css",
    ".scss",
    ".html",
    ".sql",
    ".sh",
  ].some((suffix) => normalizedName.endsWith(suffix));
}

export class LocalAttachmentStore {
  readonly rootDir: string;

  constructor(options: { rootDir: string }) {
    this.rootDir = ensureAttachmentRoot(options.rootDir);
  }

  async saveAttachment(params: SaveAttachmentParams): Promise<StoredAttachmentRecord> {
    const createdAt = params.createdAt ?? new Date();
    const id = buildAttachmentId();
    const storageKey = buildStorageKey(createdAt, id);
    const attachmentDir = this.resolveStorageKeyDirectory(storageKey);
    const originalName = normalizeOriginalName(params.fileName);
    const storedName = normalizeSegment(originalName);
    const mimeType = normalizeMimeType(params.mimeType);
    const bytes = Buffer.from(params.bytes);
    const record: StoredAttachmentRecord = {
      id,
      uri: buildAttachmentUri(storageKey),
      storageKey,
      originalName,
      storedName,
      mimeType,
      sizeBytes: bytes.length,
      createdAt: createdAt.toISOString(),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };

    await mkdir(attachmentDir, { recursive: true });
    await writeFile(join(attachmentDir, storedName), bytes);
    await writeFile(
      join(attachmentDir, "meta.json"),
      `${JSON.stringify(record)}\n`,
      "utf8",
    );
    return record;
  }

  getAttachmentByUri(uri: string): StoredAttachmentRecord | null {
    const storageKey = parseAttachmentUri(uri);
    if (!storageKey) {
      return null;
    }
    const metaPath = join(this.resolveStorageKeyDirectory(storageKey), "meta.json");
    if (!existsSync(metaPath)) {
      return null;
    }
    const text = readFileSync(metaPath, "utf8");
    return hydrateStoredAttachmentRecord(JSON.parse(text) as StoredAttachmentRecord);
  }

  async readAttachmentBytes(uri: string): Promise<Buffer | null> {
    const record = this.getAttachmentByUri(uri);
    if (!record) {
      return null;
    }
    const filePath = join(this.resolveStorageKeyDirectory(record.storageKey), record.storedName);
    try {
      return await readFile(filePath);
    } catch {
      return null;
    }
  }

  readAttachmentBytesSync(uri: string): Buffer | null {
    const record = this.getAttachmentByUri(uri);
    if (!record) {
      return null;
    }
    const filePath = join(this.resolveStorageKeyDirectory(record.storageKey), record.storedName);
    return existsSync(filePath) ? readFileSync(filePath) : null;
  }

  readTextSnapshotSync(
    uri: string,
    options: { maxBytes: number },
  ): AttachmentTextSnapshot | null {
    const record = this.getAttachmentByUri(uri);
    if (!record || !isTextLikeAttachment({ mimeType: record.mimeType, fileName: record.originalName })) {
      return null;
    }
    const bytes = this.readAttachmentBytesSync(uri);
    if (!bytes) {
      return null;
    }
    const truncated = bytes.length > options.maxBytes;
    const snapshotBytes = truncated ? bytes.subarray(0, options.maxBytes) : bytes;
    return {
      text: snapshotBytes.toString("utf8"),
      truncated,
      record,
    };
  }

  async statAttachment(uri: string): Promise<StoredAttachmentRecord | null> {
    const record = this.getAttachmentByUri(uri);
    if (!record) {
      return null;
    }
    const filePath = join(this.resolveStorageKeyDirectory(record.storageKey), record.storedName);
    try {
      await stat(filePath);
      return record;
    } catch {
      return null;
    }
  }

  resolveContentPath(uri: string): string | null {
    const record = this.getAttachmentByUri(uri);
    if (!record) {
      return null;
    }
    return join(this.resolveStorageKeyDirectory(record.storageKey), record.storedName);
  }

  private resolveStorageKeyDirectory(storageKey: string): string {
    return join(this.rootDir, ensureStorageKey(storageKey));
  }
}

export function buildAttachmentContentPath(params: {
  basePath: string;
  attachmentUri: string;
}): string {
  const query = new URLSearchParams({ uri: params.attachmentUri });
  return `${params.basePath}?${query.toString()}`;
}

export async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}
