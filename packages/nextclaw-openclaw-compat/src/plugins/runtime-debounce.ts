import { asNumber, asRecord, asString } from "./runtime-shared.js";

type InboundDebounceBuffer<T> = {
  items: T[];
  timeout: ReturnType<typeof setTimeout> | null;
  debounceMs: number;
};

export function resolveInboundDebounceMs(params: Record<string, unknown>): number {
  const cfg = asRecord(params.cfg);
  const inbound = asRecord(asRecord(cfg.messages).inbound);
  const override = asNumber(params.overrideMs);
  const byChannel = asRecord(inbound.byChannel);
  const channelOverride = asNumber(byChannel[asString(params.channel) ?? ""]);
  const base = asNumber(inbound.debounceMs);
  return Math.max(0, override ?? channelOverride ?? base ?? 0);
}

export function createInboundDebouncer<T>(params: {
  debounceMs?: number;
  buildKey?: (item: T) => string | null | undefined;
  shouldDebounce?: (item: T) => boolean;
  resolveDebounceMs?: (item: T) => number | undefined;
  onFlush?: (items: T[]) => Promise<void>;
  onError?: (error: unknown, items: T[]) => void;
}) {
  const buffers = new Map<string, InboundDebounceBuffer<T>>();
  const defaultDebounceMs = Math.max(0, Math.trunc(params.debounceMs ?? 0));

  const flushBuffer = async (key: string, buffer: InboundDebounceBuffer<T>) => {
    buffers.delete(key);
    if (buffer.timeout) {
      clearTimeout(buffer.timeout);
      buffer.timeout = null;
    }
    if (buffer.items.length === 0 || !params.onFlush) {
      return;
    }
    try {
      await params.onFlush(buffer.items);
    } catch (error) {
      params.onError?.(error, buffer.items);
    }
  };

  const flushKey = async (key: string) => {
    const buffer = buffers.get(key);
    if (!buffer) {
      return;
    }
    await flushBuffer(key, buffer);
  };

  const scheduleFlush = (key: string, buffer: InboundDebounceBuffer<T>) => {
    if (buffer.timeout) {
      clearTimeout(buffer.timeout);
    }
    buffer.timeout = setTimeout(() => {
      void flushBuffer(key, buffer);
    }, buffer.debounceMs);
    buffer.timeout.unref?.();
  };

  const enqueue = async (item: T) => {
    const key = params.buildKey?.(item);
    const resolvedDebounceMs = params.resolveDebounceMs?.(item);
    const debounceMs =
      typeof resolvedDebounceMs === "number" && Number.isFinite(resolvedDebounceMs)
        ? Math.max(0, Math.trunc(resolvedDebounceMs))
        : defaultDebounceMs;
    const canDebounce = debounceMs > 0 && (params.shouldDebounce?.(item) ?? true);

    if (!key || !canDebounce) {
      if (key && buffers.has(key)) {
        await flushKey(key);
      }
      if (!params.onFlush) {
        return;
      }
      try {
        await params.onFlush([item]);
      } catch (error) {
        params.onError?.(error, [item]);
      }
      return;
    }

    const existing = buffers.get(key);
    if (existing) {
      existing.items.push(item);
      existing.debounceMs = debounceMs;
      scheduleFlush(key, existing);
      return;
    }

    const buffer: InboundDebounceBuffer<T> = {
      items: [item],
      timeout: null,
      debounceMs,
    };
    buffers.set(key, buffer);
    scheduleFlush(key, buffer);
  };

  return { enqueue, flushKey };
}
