import type { NcpMessagePart, OpenAIContentPart } from "@nextclaw/ncp";
import { isTextLikeAttachment, type LocalAttachmentStore } from "./attachment-store.js";

const DEFAULT_ATTACHMENT_TEXT_MAX_BYTES = 32 * 1024;

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function decodeInlineBase64(base64: string): Buffer | null {
  try {
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

function formatTextAttachmentBlock(params: {
  fileName?: string | null;
  mimeType?: string | null;
  text: string;
  truncated: boolean;
}): string {
  const fileName = readOptionalString(params.fileName) ?? "attachment";
  const mimeType = readOptionalString(params.mimeType) ?? "application/octet-stream";
  const suffix = params.truncated ? "\n[Attachment truncated]" : "";
  return `[Attachment: ${fileName}]\n[MIME: ${mimeType}]\n${params.text}${suffix}`;
}

function resolveImageDataUrl(
  part: Extract<NcpMessagePart, { type: "file" }>,
  attachmentStore?: LocalAttachmentStore | null,
): string | null {
  const attachmentUri = readOptionalString(part.attachmentUri);
  const mimeType = readOptionalString(part.mimeType);
  if (attachmentUri && mimeType?.startsWith("image/")) {
    const bytes = attachmentStore?.readAttachmentBytesSync(attachmentUri);
    if (bytes) {
      return `data:${mimeType};base64,${bytes.toString("base64")}`;
    }
  }

  const url = readOptionalString(part.url);
  if (url) {
    return url;
  }

  const contentBase64 = readOptionalString(part.contentBase64);
  if (!mimeType || !contentBase64 || !mimeType.startsWith("image/")) {
    return null;
  }
  return `data:${mimeType};base64,${contentBase64}`;
}

function resolveTextAttachmentBlock(
  part: Extract<NcpMessagePart, { type: "file" }>,
  options: {
    attachmentStore?: LocalAttachmentStore | null;
    maxTextBytes?: number;
  },
): string | null {
  const attachmentUri = readOptionalString(part.attachmentUri);
  const fileName = readOptionalString(part.name);
  const mimeType = readOptionalString(part.mimeType);
  const maxTextBytes = options.maxTextBytes ?? DEFAULT_ATTACHMENT_TEXT_MAX_BYTES;
  if (attachmentUri) {
    const snapshot = options.attachmentStore?.readTextSnapshotSync(attachmentUri, {
      maxBytes: maxTextBytes,
    });
    if (snapshot) {
      return formatTextAttachmentBlock({
        fileName: snapshot.record.originalName,
        mimeType: snapshot.record.mimeType,
        text: snapshot.text,
        truncated: snapshot.truncated,
      });
    }
  }

  const contentBase64 = readOptionalString(part.contentBase64);
  if (!contentBase64 || !isTextLikeAttachment({ mimeType, fileName })) {
    return null;
  }
  const bytes = decodeInlineBase64(contentBase64);
  if (!bytes) {
    return null;
  }
  const truncated = bytes.length > maxTextBytes;
  const text = (truncated ? bytes.subarray(0, maxTextBytes) : bytes).toString("utf8");
  return formatTextAttachmentBlock({
    fileName,
    mimeType,
    text,
    truncated,
  });
}

export function buildNcpUserContent(
  parts: NcpMessagePart[],
  options: {
    attachmentStore?: LocalAttachmentStore | null;
    maxTextBytes?: number;
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

    const textAttachmentBlock = resolveTextAttachmentBlock(part, options);
    if (textAttachmentBlock) {
      content.push({ type: "text", text: textAttachmentBlock });
      continue;
    }

    const imageUrl = resolveImageDataUrl(part, options.attachmentStore);
    if (!imageUrl) {
      continue;
    }

    content.push({
      type: "image_url",
      image_url: {
        url: imageUrl,
      },
    });
  }

  if (content.length === 0) {
    return "";
  }
  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text;
  }
  return content;
}
