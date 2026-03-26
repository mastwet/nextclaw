import type { NcpMessagePart, OpenAIContentPart } from "@nextclaw/ncp";
import type { LocalAssetStore } from "./asset-store.js";

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatAssetReferenceBlock(params: {
  fileName?: string | null;
  mimeType?: string | null;
  assetUri?: string | null;
  url?: string | null;
  sizeBytes?: number;
}): string {
  const fileName = readOptionalString(params.fileName) ?? "asset";
  const mimeType = readOptionalString(params.mimeType) ?? "application/octet-stream";
  const assetUri = readOptionalString(params.assetUri);
  const url = readOptionalString(params.url);
  const sizeText =
    typeof params.sizeBytes === "number" && Number.isFinite(params.sizeBytes)
      ? String(params.sizeBytes)
      : null;

  const lines = [
    `[Asset: ${fileName}]`,
    `[MIME: ${mimeType}]`,
    ...(assetUri ? [`[Asset URI: ${assetUri}]`] : []),
    ...(sizeText ? [`[Size Bytes: ${sizeText}]`] : []),
    ...(url ? [`[Preview URL: ${url}]`] : []),
    "[Instruction: This file is not embedded in the prompt. If you need to inspect or transform it, use asset_export to copy it to a normal file path first.]",
  ];
  return lines.join("\n");
}

function resolveAssetReferenceBlock(
  part: Extract<NcpMessagePart, { type: "file" }>,
  assetStore?: LocalAssetStore | null,
): string | null {
  const fileName = readOptionalString(part.name);
  const mimeType = readOptionalString(part.mimeType);
  const assetUri = readOptionalString(part.assetUri);
  const url = readOptionalString(part.url);
  const sizeBytes = typeof part.sizeBytes === "number" ? part.sizeBytes : undefined;

  if (assetUri) {
    const stored = assetStore?.getByUri(assetUri);
    return formatAssetReferenceBlock({
      fileName: stored?.fileName ?? fileName,
      mimeType: stored?.mimeType ?? mimeType,
      assetUri,
      url,
      sizeBytes: stored?.sizeBytes ?? sizeBytes,
    });
  }

  if (url || part.contentBase64) {
    return formatAssetReferenceBlock({
      fileName,
      mimeType,
      url,
      sizeBytes,
    });
  }

  return null;
}

export function buildNcpUserContent(
  parts: NcpMessagePart[],
  options: {
    assetStore?: LocalAssetStore | null;
  } = {},
): string | OpenAIContentPart[] {
  const content: OpenAIContentPart[] = [];

  for (const part of parts) {
    if ((part.type === "text" || part.type === "rich-text") && part.text.trim().length > 0) {
      content.push({ type: "text", text: part.text });
      continue;
    }

    if (part.type !== "file") {
      continue;
    }

    const assetReferenceBlock = resolveAssetReferenceBlock(part, options.assetStore);
    if (assetReferenceBlock) {
      content.push({ type: "text", text: assetReferenceBlock });
    }
  }

  if (content.length === 0) {
    return "";
  }
  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text;
  }
  return content;
}
