import type { SessionMessageView } from '@/api/types';

export type ChatRole = 'user' | 'assistant' | 'tool' | 'system' | 'other';

export type ToolCard = {
  kind: 'call' | 'result';
  name: string;
  detail?: string;
  text?: string;
  callId?: string;
  hasResult?: boolean;
};

export type GroupedChatMessage = {
  key: string;
  role: ChatRole;
  messages: SessionMessageView[];
  timestamp: string;
};

const MERGE_WINDOW_MS = 2 * 60 * 1000;
const TOOL_DETAIL_FIELDS = ['cmd', 'command', 'query', 'q', 'path', 'url', 'to', 'channel', 'agentId', 'sessionKey'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function truncateText(value: string, maxChars = 2400): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}\n…`;
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value == null) {
    return '';
  }
  try {
    return truncateText(JSON.stringify(value, null, 2));
  } catch {
    return String(value);
  }
}

function parseArgsObject(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function summarizeToolArgs(args: unknown): string | undefined {
  const parsed = parseArgsObject(args);
  if (!parsed) {
    const text = stringifyUnknown(args).trim();
    return text ? truncateText(text, 120) : undefined;
  }

  const items: string[] = [];
  for (const field of TOOL_DETAIL_FIELDS) {
    const value = parsed[field];
    if (typeof value === 'string' && value.trim()) {
      items.push(`${field}: ${value.trim()}`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      items.push(`${field}: ${String(value)}`);
    }
    if (items.length >= 2) {
      break;
    }
  }
  if (items.length > 0) {
    return items.join(' · ');
  }
  return truncateText(stringifyUnknown(parsed), 140);
}

function toToolName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'tool';
  }
  return value.trim();
}

function hasToolCalls(message: SessionMessageView): boolean {
  return Array.isArray(message.tool_calls) && message.tool_calls.length > 0;
}

function mergeMessageContent(base: unknown, addition: unknown): unknown {
  const left = extractMessageText(base).trim();
  const right = extractMessageText(addition).trim();
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return `${left}\n\n${right}`;
}

function mergeReasoningContent(base: unknown, addition: unknown): string | undefined {
  const left = typeof base === 'string' ? base.trim() : '';
  const right = typeof addition === 'string' ? addition.trim() : '';
  if (!left) {
    return right || undefined;
  }
  if (!right) {
    return left;
  }
  return `${left}\n\n${right}`;
}

export function normalizeChatRole(message: Pick<SessionMessageView, 'role' | 'name' | 'tool_call_id' | 'tool_calls'>): ChatRole {
  const role = message.role.toLowerCase().trim();
  if (role === 'user') {
    return 'user';
  }
  if (role === 'assistant') {
    return 'assistant';
  }
  if (role === 'system') {
    return 'system';
  }
  if (role === 'tool' || role === 'tool_result' || role === 'toolresult' || role === 'function') {
    return 'tool';
  }
  if (typeof message.tool_call_id === 'string' || Array.isArray(message.tool_calls) || typeof message.name === 'string') {
    return 'tool';
  }
  return 'other';
}

export function extractMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const item of content) {
      if (typeof item === 'string') {
        parts.push(item);
        continue;
      }
      if (!isRecord(item)) {
        continue;
      }
      if (typeof item.text === 'string') {
        parts.push(item.text);
        continue;
      }
      if (typeof item.content === 'string') {
        parts.push(item.content);
      }
    }
    if (parts.length > 0) {
      return parts.join('\n');
    }
  }
  return stringifyUnknown(content);
}

export function extractToolCards(message: SessionMessageView): ToolCard[] {
  const cards: ToolCard[] = [];
  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  for (const call of toolCalls) {
    if (!isRecord(call)) {
      continue;
    }
    const fn = isRecord(call.function) ? call.function : null;
    const name = toToolName(fn?.name ?? call.name);
    const args = fn?.arguments ?? call.arguments;
    const resultText = typeof call.result_text === 'string' ? call.result_text.trim() : '';
    const hasResult = call.has_result === true || typeof call.result_text === 'string';
    cards.push({
      kind: 'call',
      name,
      detail: summarizeToolArgs(args),
      callId: typeof call.id === 'string' ? call.id : undefined,
      text: resultText,
      hasResult
    });
  }

  const role = normalizeChatRole(message);
  if (role === 'tool' || typeof message.tool_call_id === 'string') {
    const text = extractMessageText(message.content).trim();
    cards.push({
      kind: 'result',
      name: toToolName(message.name ?? cards[0]?.name),
      text,
      callId: typeof message.tool_call_id === 'string' ? message.tool_call_id : undefined,
      hasResult: true
    });
  }

  return cards;
}

type ToolResultBucket = {
  name?: string;
  texts: string[];
};

function cloneMessageForMerge(message: SessionMessageView): SessionMessageView {
  return {
    ...message,
    tool_calls: Array.isArray(message.tool_calls)
      ? message.tool_calls.map((call) => (isRecord(call) ? { ...call } : call))
      : message.tool_calls
  };
}

export function combineToolCallAndResults(messages: SessionMessageView[]): SessionMessageView[] {
  const cloned = messages.map(cloneMessageForMerge);
  const resultByCallId = new Map<string, ToolResultBucket>();

  for (const message of cloned) {
    if (normalizeChatRole(message) !== 'tool') {
      continue;
    }
    if (typeof message.tool_call_id !== 'string' || !message.tool_call_id.trim()) {
      continue;
    }

    const callId = message.tool_call_id.trim();
    const text = extractMessageText(message.content).trim();
    const existing = resultByCallId.get(callId) ?? { texts: [] };
    if (typeof message.name === 'string' && message.name.trim()) {
      existing.name = message.name.trim();
    }
    existing.texts.push(text);
    resultByCallId.set(callId, existing);
  }

  const consumedCallIds = new Set<string>();

  for (const message of cloned) {
    if (normalizeChatRole(message) !== 'assistant' || !hasToolCalls(message)) {
      continue;
    }

    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    message.tool_calls = toolCalls.map((call) => {
      if (!isRecord(call) || typeof call.id !== 'string') {
        return call;
      }
      const result = resultByCallId.get(call.id);
      if (!result) {
        return call;
      }
      consumedCallIds.add(call.id);
      return {
        ...call,
        result_text: result.texts.filter(Boolean).join('\n\n'),
        has_result: true,
        result_name: result.name
      };
    }) as Array<Record<string, unknown>>;
  }

  const mergedToolResults = cloned.filter((message) => {
    if (normalizeChatRole(message) !== 'tool') {
      return true;
    }
    if (typeof message.tool_call_id !== 'string' || !message.tool_call_id.trim()) {
      return true;
    }
    return !consumedCallIds.has(message.tool_call_id.trim());
  });

  const mergedFollowups: SessionMessageView[] = [];
  for (let index = 0; index < mergedToolResults.length; index += 1) {
    const current = mergedToolResults[index];
    if (normalizeChatRole(current) !== 'assistant' || !hasToolCalls(current)) {
      mergedFollowups.push(current);
      continue;
    }

    let merged = current;
    let cursor = index + 1;
    while (cursor < mergedToolResults.length) {
      const candidate = mergedToolResults[cursor];
      if (normalizeChatRole(candidate) !== 'assistant') {
        break;
      }
      if (hasToolCalls(candidate) || typeof candidate.tool_call_id === 'string') {
        break;
      }

      const candidateText = extractMessageText(candidate.content).trim();
      const candidateReasoning = typeof candidate.reasoning_content === 'string' && candidate.reasoning_content.trim();
      if (!candidateText && !candidateReasoning) {
        break;
      }

      merged = {
        ...merged,
        content: mergeMessageContent(merged.content, candidate.content),
        reasoning_content: mergeReasoningContent(merged.reasoning_content, candidate.reasoning_content),
        timestamp: candidate.timestamp
      };
      cursor += 1;
    }

    mergedFollowups.push(merged);
    index = cursor - 1;
  }

  return mergedFollowups;
}

export function groupChatMessages(messages: SessionMessageView[]): GroupedChatMessage[] {
  const groups: GroupedChatMessage[] = [];
  let lastTs = 0;

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const role = normalizeChatRole(message);
    const parsedTs = Date.parse(message.timestamp);
    const ts = Number.isFinite(parsedTs) ? parsedTs : Date.now();
    const previous = groups[groups.length - 1];
    const canMerge =
      previous &&
      previous.role === role &&
      Math.abs(ts - lastTs) <= MERGE_WINDOW_MS;

    if (canMerge) {
      previous.messages.push(message);
      previous.timestamp = message.timestamp;
      lastTs = ts;
      continue;
    }

    groups.push({
      key: `${message.timestamp}-${index}-${role}`,
      role,
      messages: [message],
      timestamp: message.timestamp
    });
    lastTs = ts;
  }

  return groups;
}
