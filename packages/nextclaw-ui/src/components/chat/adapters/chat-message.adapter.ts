import {
  stringifyUnknown,
  summarizeToolArgs,
  type ToolCard
} from '@/lib/chat-message';
import type {
  ChatMessageRole,
  ChatMessageViewModel,
  ChatToolPartViewModel
} from '@nextclaw/agent-chat-ui';

export type ChatMessagePartSource =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'file';
      mimeType: string;
      data: string;
      url?: string;
      name?: string;
    }
  | {
      type: 'reasoning';
      reasoning: string;
    }
  | {
      type: 'tool-invocation';
      toolInvocation: {
        status?: string;
        toolName: string;
        args?: unknown;
        parsedArgs?: unknown;
        result?: unknown;
        error?: string;
        toolCallId?: string;
      };
    }
  | {
      type: string;
      [key: string]: unknown;
    };

export type ChatMessageSource = {
  id: string;
  role: string;
  meta?: {
    timestamp?: string;
    status?: string;
  };
  parts: ChatMessagePartSource[];
};

export type ChatMessageAdapterTexts = {
  roleLabels: {
    user: string;
    assistant: string;
    tool: string;
    system: string;
    fallback: string;
  };
  reasoningLabel: string;
  toolCallLabel: string;
  toolResultLabel: string;
  toolNoOutputLabel: string;
  toolOutputLabel: string;
  imageAttachmentLabel: string;
  fileAttachmentLabel: string;
  unknownPartLabel: string;
};

const INVISIBLE_ONLY_TEXT_PATTERN = /\u200B|\u200C|\u200D|\u2060|\uFEFF/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractAssetFileView(
  value: unknown,
  texts: ChatMessageAdapterTexts
):
  | {
      type: 'file';
      file: {
        label: string;
        mimeType: string;
        dataUrl: string;
        isImage: boolean;
      };
    }
  | null {
  if (!isRecord(value)) {
    return null;
  }
  const assetCandidate = isRecord(value.asset)
    ? value.asset
    : Array.isArray(value.assets) && value.assets.length > 0 && isRecord(value.assets[0])
      ? value.assets[0]
      : null;
  if (!assetCandidate) {
    return null;
  }
  const url = readOptionalString(assetCandidate.url);
  const mimeType = readOptionalString(assetCandidate.mimeType) ?? 'application/octet-stream';
  if (!url) {
    return null;
  }
  const label =
    readOptionalString(assetCandidate.name) ??
    (mimeType.startsWith('image/') ? texts.imageAttachmentLabel : texts.fileAttachmentLabel);
  return {
    type: 'file',
    file: {
      label,
      mimeType,
      dataUrl: url,
      isImage: mimeType.startsWith('image/')
    }
  };
}

function isTextPart(part: ChatMessagePartSource): part is Extract<ChatMessagePartSource, { type: 'text' }> {
  return part.type === 'text' && typeof part.text === 'string';
}

function isReasoningPart(
  part: ChatMessagePartSource
): part is Extract<ChatMessagePartSource, { type: 'reasoning' }> {
  return part.type === 'reasoning' && typeof part.reasoning === 'string';
}

function isFilePart(
  part: ChatMessagePartSource
): part is Extract<ChatMessagePartSource, { type: 'file' }> {
  return (
    part.type === 'file' &&
    typeof part.mimeType === 'string' &&
    typeof part.data === 'string'
  );
}

function isToolInvocationPart(
  part: ChatMessagePartSource
): part is Extract<ChatMessagePartSource, { type: 'tool-invocation' }> {
  if (part.type !== 'tool-invocation') {
    return false;
  }
  if (!isRecord(part.toolInvocation)) {
    return false;
  }
  return typeof part.toolInvocation.toolName === 'string';
}

function resolveMessageTimestamp(message: ChatMessageSource): string {
  const candidate = message.meta?.timestamp;
  if (candidate && Number.isFinite(Date.parse(candidate))) {
    return candidate;
  }
  return new Date().toISOString();
}

function resolveRoleLabel(
  role: string,
  texts: ChatMessageAdapterTexts['roleLabels']
): string {
  if (role === 'user') {
    return texts.user;
  }
  if (role === 'assistant') {
    return texts.assistant;
  }
  if (role === 'tool') {
    return texts.tool;
  }
  if (role === 'system') {
    return texts.system;
  }
  return texts.fallback;
}

function resolveUiRole(role: string): ChatMessageRole {
  if (role === 'user' || role === 'assistant' || role === 'tool' || role === 'system') {
    return role;
  }
  return 'message';
}

function buildToolCard(
  toolCard: ToolCard,
  texts: ChatMessageAdapterTexts
): ChatToolPartViewModel {
  return {
    kind: toolCard.kind,
    toolName: toolCard.name,
    summary: toolCard.detail,
    output: toolCard.text,
    hasResult: Boolean(toolCard.hasResult),
    titleLabel: toolCard.kind === 'call' ? texts.toolCallLabel : texts.toolResultLabel,
    outputLabel: texts.toolOutputLabel,
    emptyLabel: texts.toolNoOutputLabel
  };
}

function toRenderableText(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const visible = trimmed.replace(INVISIBLE_ONLY_TEXT_PATTERN, "").trim();
  return visible ? trimmed : null;
}

export function adaptChatMessages(params: {
  uiMessages: ChatMessageSource[];
  texts: ChatMessageAdapterTexts;
  formatTimestamp: (value: string) => string;
}): ChatMessageViewModel[] {
  return params.uiMessages.map((message) => ({
    id: message.id,
    role: resolveUiRole(message.role),
    roleLabel: resolveRoleLabel(message.role, params.texts.roleLabels),
    timestampLabel: params.formatTimestamp(resolveMessageTimestamp(message)),
    status: message.meta?.status,
    parts: message.parts
      .map((part) => {
        if (isTextPart(part)) {
          const text = toRenderableText(part.text);
          if (!text) {
            return null;
          }
          return {
            type: 'markdown' as const,
            text
          };
        }
        if (isReasoningPart(part)) {
          const text = toRenderableText(part.reasoning);
          if (!text) {
            return null;
          }
          return {
            type: 'reasoning' as const,
            text,
            label: params.texts.reasoningLabel
          };
        }
        if (isFilePart(part)) {
          const isImage = part.mimeType.startsWith('image/');
          return {
            type: 'file' as const,
            file: {
              label:
                typeof part.name === 'string' && part.name.trim()
                  ? part.name.trim()
                  : isImage
                    ? params.texts.imageAttachmentLabel
                    : params.texts.fileAttachmentLabel,
              mimeType: part.mimeType,
              dataUrl:
                typeof part.url === 'string' && part.url.trim().length > 0
                  ? part.url.trim()
                  : `data:${part.mimeType};base64,${part.data}`,
              isImage
            }
          };
        }
        if (isToolInvocationPart(part)) {
          const invocation = part.toolInvocation;
          const assetFileView = extractAssetFileView(invocation.result, params.texts);
          if (assetFileView) {
            return assetFileView;
          }
          const detail = summarizeToolArgs(invocation.parsedArgs ?? invocation.args);
          const rawResult =
            typeof invocation.error === 'string' && invocation.error.trim()
              ? invocation.error.trim()
              : invocation.result != null
                ? stringifyUnknown(invocation.result).trim()
                : '';
          const hasResult =
            invocation.status === 'result' || invocation.status === 'error' || invocation.status === 'cancelled';
          const card: ToolCard = {
            kind: hasResult ? 'result' : 'call',
            name: invocation.toolName,
            detail,
            text: rawResult || undefined,
            callId: invocation.toolCallId || undefined,
            hasResult
          };
          return {
            type: 'tool-card' as const,
            card: buildToolCard(card, params.texts)
          };
        }
        return {
          type: 'unknown' as const,
          label: params.texts.unknownPartLabel,
          rawType: typeof part.type === 'string' ? part.type : 'unknown',
          text: stringifyUnknown(part)
        };
      })
      .filter((part) => part !== null)
  }));
}
