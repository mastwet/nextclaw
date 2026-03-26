import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, extname, isAbsolute, resolve } from "node:path";
import { asNumber, asString, readStringArray } from "./runtime-shared.js";

export function detectMimeFromBuffer(buffer: Buffer): string | undefined {
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF87a") {
    return "image/gif";
  }
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF89a") {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
    return "application/pdf";
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return "video/mp4";
  }
  return undefined;
}

function mimeToExtension(contentType?: string, fileName?: string): string {
  const byName = extname(fileName ?? "").trim();
  if (byName) {
    return byName;
  }
  switch (contentType) {
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "application/pdf":
      return ".pdf";
    case "video/mp4":
      return ".mp4";
    default:
      return ".bin";
  }
}

export async function saveMediaBuffer(
  buffer: Buffer,
  contentType?: string,
  direction?: string,
  maxBytes?: number,
  fileName?: string,
): Promise<{ path: string; contentType?: string }> {
  if (typeof maxBytes === "number" && Number.isFinite(maxBytes) && buffer.length > maxBytes) {
    throw new Error(`media exceeds maxBytes (${buffer.length} > ${maxBytes})`);
  }
  const detectedContentType =
    contentType ?? detectMimeFromBuffer(buffer) ?? "application/octet-stream";
  const targetDir = resolve(tmpdir(), "nextclaw-media", direction ?? "shared");
  await mkdir(targetDir, { recursive: true });
  const targetPath = resolve(
    targetDir,
    `${randomUUID()}${mimeToExtension(detectedContentType, fileName)}`,
  );
  await writeFile(targetPath, buffer);
  return {
    path: targetPath,
    contentType: detectedContentType,
  };
}

export async function fetchRemoteMedia(params: {
  url: string;
  maxBytes?: number;
}): Promise<Record<string, unknown>> {
  const response = await fetch(params.url);
  if (!response.ok) {
    throw new Error(`failed to fetch media: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (
    typeof params.maxBytes === "number" &&
    Number.isFinite(params.maxBytes) &&
    buffer.length > params.maxBytes
  ) {
    throw new Error(`media exceeds maxBytes (${buffer.length} > ${params.maxBytes})`);
  }
  return {
    buffer,
    contentType: asString(response.headers.get("content-type")) ?? detectMimeFromBuffer(buffer),
    fileName: basename(new URL(params.url).pathname) || "file",
  };
}

function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function assertAllowedLocalPath(filePath: string, localRoots: string[]): void {
  if (localRoots.length === 0) {
    return;
  }
  const resolvedPath = resolve(filePath);
  const allowed = localRoots.some((root) => {
    const resolvedRoot = resolve(root);
    return resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}/`);
  });
  if (!allowed) {
    throw new Error(`local media path is outside allowed roots: ${resolvedPath}`);
  }
}

export async function loadWebMedia(
  url: string,
  options?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (isRemoteUrl(url)) {
    return fetchRemoteMedia({
      url,
      maxBytes: asNumber(options?.maxBytes),
    });
  }

  const localRoots = readStringArray(options?.localRoots);
  const candidate = isAbsolute(url) ? url : resolve(url);
  if (!existsSync(candidate)) {
    throw new Error(`local media file not found: ${candidate}`);
  }
  assertAllowedLocalPath(candidate, localRoots);
  const buffer = await readFile(candidate);
  const maxBytes = asNumber(options?.maxBytes);
  if (typeof maxBytes === "number" && buffer.length > maxBytes) {
    throw new Error(`media exceeds maxBytes (${buffer.length} > ${maxBytes})`);
  }
  return {
    buffer,
    fileName: basename(candidate),
    contentType: detectMimeFromBuffer(buffer),
  };
}
