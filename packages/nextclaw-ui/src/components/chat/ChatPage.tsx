import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionEntryView, SessionEventView } from '@/api/types';
import { sendChatTurnStream } from '@/api/config';
import { useConfig, useDeleteSession, useSessionHistory, useSessions } from '@/hooks/useConfig';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader, PageLayout } from '@/components/layout/page-layout';
import { ChatThread } from '@/components/chat/ChatThread';
import { cn } from '@/lib/utils';
import { buildFallbackEventsFromMessages } from '@/lib/chat-message';
import { formatDateTime, t } from '@/lib/i18n';
import { MessageSquareText, Plus, RefreshCw, Search, Send, Trash2 } from 'lucide-react';

const CHAT_SESSION_STORAGE_KEY = 'nextclaw.ui.chat.activeSession';
const UNKNOWN_CHAT_CHANNEL_KEY = '__unknown_channel__';

function readStoredSessionKey(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const value = window.localStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    return value && value.trim().length > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStoredSessionKey(value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (!value) {
      window.localStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CHAT_SESSION_STORAGE_KEY, value);
  } catch {
    // ignore storage errors
  }
}

function resolveAgentIdFromSessionKey(sessionKey: string): string | null {
  const match = /^agent:([^:]+):/i.exec(sessionKey.trim());
  if (!match) {
    return null;
  }
  const value = match[1]?.trim();
  return value ? value : null;
}

function buildNewSessionKey(agentId: string): string {
  const slug = Math.random().toString(36).slice(2, 8);
  return `agent:${agentId}:ui:direct:web-${Date.now().toString(36)}${slug}`;
}

function sessionDisplayName(session: SessionEntryView): string {
  if (session.label && session.label.trim()) {
    return session.label.trim();
  }
  const chunks = session.key.split(':');
  return chunks[chunks.length - 1] || session.key;
}

function resolveChannelFromSessionKey(key: string): string {
  const separator = key.indexOf(':');
  if (separator <= 0) {
    return UNKNOWN_CHAT_CHANNEL_KEY;
  }
  const channel = key.slice(0, separator).trim();
  return channel || UNKNOWN_CHAT_CHANNEL_KEY;
}

function displayChannelName(channel: string): string {
  if (channel === UNKNOWN_CHAT_CHANNEL_KEY) {
    return t('sessionsUnknownChannel');
  }
  return channel;
}

type PendingChatMessage = {
  id: number;
  message: string;
  sessionKey: string;
  agentId: string;
};

export function ChatPage() {
  const [query, setQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [draft, setDraft] = useState('');
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(() => readStoredSessionKey());
  const [selectedAgentId, setSelectedAgentId] = useState('main');
  const [optimisticUserEvent, setOptimisticUserEvent] = useState<SessionEventView | null>(null);
  const [streamingSessionEvents, setStreamingSessionEvents] = useState<SessionEventView[]>([]);
  const [streamingAssistantText, setStreamingAssistantText] = useState('');
  const [streamingAssistantTimestamp, setStreamingAssistantTimestamp] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isAwaitingAssistantOutput, setIsAwaitingAssistantOutput] = useState(false);
  const [queuedMessages, setQueuedMessages] = useState<PendingChatMessage[]>([]);

  const { confirm, ConfirmDialog } = useConfirmDialog();
  const threadRef = useRef<HTMLDivElement | null>(null);
  const streamRunIdRef = useRef(0);
  const queueIdRef = useRef(0);
  const selectedSessionKeyRef = useRef<string | null>(selectedSessionKey);

  const configQuery = useConfig();
  const sessionsQuery = useSessions({ q: query.trim() || undefined, limit: 120, activeMinutes: 0 });
  const historyQuery = useSessionHistory(selectedSessionKey, 300);
  const deleteSession = useDeleteSession();

  const agentOptions = useMemo(() => {
    const list = configQuery.data?.agents.list ?? [];
    const unique = new Set<string>(['main']);
    for (const item of list) {
      if (typeof item.id === 'string' && item.id.trim().length > 0) {
        unique.add(item.id.trim().toLowerCase());
      }
    }
    return Array.from(unique);
  }, [configQuery.data?.agents.list]);

  const sessions = useMemo(() => sessionsQuery.data?.sessions ?? [], [sessionsQuery.data?.sessions]);
  const channelOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const session of sessions) {
      unique.add(resolveChannelFromSessionKey(session.key));
    }
    return Array.from(unique).sort((a, b) => {
      if (a === UNKNOWN_CHAT_CHANNEL_KEY) return 1;
      if (b === UNKNOWN_CHAT_CHANNEL_KEY) return -1;
      return a.localeCompare(b);
    });
  }, [sessions]);
  const filteredSessions = useMemo(() => {
    if (selectedChannel === 'all') {
      return sessions;
    }
    return sessions.filter((session) => resolveChannelFromSessionKey(session.key) === selectedChannel);
  }, [selectedChannel, sessions]);
  const selectedSession = useMemo(
    () => sessions.find((session) => session.key === selectedSessionKey) ?? null,
    [selectedSessionKey, sessions]
  );

  const historyData = historyQuery.data;
  const historyMessages = historyData?.messages ?? [];
  const historyEvents =
    historyData?.events && historyData.events.length > 0
      ? historyData.events
      : buildFallbackEventsFromMessages(historyMessages);
  const mergedEvents = useMemo(() => {
    const next = [...historyEvents];
    if (optimisticUserEvent) {
      next.push(optimisticUserEvent);
    }
    next.push(...streamingSessionEvents);
    if (streamingAssistantText.trim()) {
      const maxSeq = next.reduce((max, event) => {
        const seq = Number.isFinite(event.seq) ? event.seq : 0;
        return seq > max ? seq : max;
      }, 0);
      next.push({
        seq: maxSeq + 1,
        type: 'stream.assistant_delta',
        timestamp: streamingAssistantTimestamp ?? new Date().toISOString(),
        message: {
          role: 'assistant',
          content: streamingAssistantText,
          timestamp: streamingAssistantTimestamp ?? new Date().toISOString()
        }
      });
    }
    return next;
  }, [historyEvents, optimisticUserEvent, streamingAssistantText, streamingAssistantTimestamp, streamingSessionEvents]);

  useEffect(() => {
    if (!selectedSessionKey && filteredSessions.length > 0) {
      setSelectedSessionKey(filteredSessions[0].key);
    }
  }, [filteredSessions, selectedSessionKey]);

  useEffect(() => {
    writeStoredSessionKey(selectedSessionKey);
  }, [selectedSessionKey]);

  useEffect(() => {
    const inferred = selectedSessionKey ? resolveAgentIdFromSessionKey(selectedSessionKey) : null;
    if (!inferred) {
      return;
    }
    if (selectedAgentId !== inferred) {
      setSelectedAgentId(inferred);
    }
  }, [selectedAgentId, selectedSessionKey]);

  useEffect(() => {
    selectedSessionKeyRef.current = selectedSessionKey;
  }, [selectedSessionKey]);

  useEffect(() => {
    const element = threadRef.current;
    if (!element) {
      return;
    }
    element.scrollTop = element.scrollHeight;
  }, [mergedEvents, isSending, selectedSessionKey]);

  useEffect(() => {
    return () => {
      streamRunIdRef.current += 1;
    };
  }, []);

  const createNewSession = () => {
    streamRunIdRef.current += 1;
    setIsSending(false);
    setQueuedMessages([]);
    setOptimisticUserEvent(null);
    setStreamingSessionEvents([]);
    setStreamingAssistantText('');
    setStreamingAssistantTimestamp(null);
    setIsAwaitingAssistantOutput(false);
    const next = buildNewSessionKey(selectedAgentId);
    setSelectedSessionKey(next);
  };

  const handleDeleteSession = async () => {
    if (!selectedSessionKey) {
      return;
    }
    const confirmed = await confirm({
      title: t('chatDeleteSessionConfirm'),
      variant: 'destructive',
      confirmLabel: t('delete')
    });
    if (!confirmed) {
      return;
    }
    deleteSession.mutate(
      { key: selectedSessionKey },
      {
        onSuccess: async () => {
          streamRunIdRef.current += 1;
          setIsSending(false);
          setQueuedMessages([]);
          setOptimisticUserEvent(null);
          setStreamingSessionEvents([]);
          setStreamingAssistantText('');
          setStreamingAssistantTimestamp(null);
          setIsAwaitingAssistantOutput(false);
          setSelectedSessionKey(null);
          await sessionsQuery.refetch();
        }
      }
    );
  };

  const runSend = useCallback(async (item: PendingChatMessage, options?: { restoreDraftOnError?: boolean }) => {
    streamRunIdRef.current += 1;
    const runId = streamRunIdRef.current;

    setStreamingSessionEvents([]);
    setStreamingAssistantText('');
    setStreamingAssistantTimestamp(null);
    setOptimisticUserEvent({
      seq: 0,
      type: 'message.user.optimistic',
      timestamp: new Date().toISOString(),
      message: {
        role: 'user',
        content: item.message,
        timestamp: new Date().toISOString()
      }
    });
    setIsSending(true);
    setIsAwaitingAssistantOutput(true);

    try {
      let streamText = '';
      const streamTimestamp = new Date().toISOString();
      setStreamingAssistantTimestamp(streamTimestamp);

      const result = await sendChatTurnStream({
        message: item.message,
        sessionKey: item.sessionKey,
        agentId: item.agentId,
        channel: 'ui',
        chatId: 'web-ui'
      }, {
        onReady: (event) => {
          if (runId !== streamRunIdRef.current) {
            return;
          }
          if (event.sessionKey) {
            setSelectedSessionKey((prev) => prev === event.sessionKey ? prev : event.sessionKey);
          }
        },
        onDelta: (event) => {
          if (runId !== streamRunIdRef.current) {
            return;
          }
          streamText += event.delta;
          setStreamingAssistantText(streamText);
          setIsAwaitingAssistantOutput(false);
        },
        onSessionEvent: (event) => {
          if (runId !== streamRunIdRef.current) {
            return;
          }
          if (event.data.message?.role === 'user') {
            setOptimisticUserEvent(null);
          }
          setStreamingSessionEvents((prev) => {
            const next = [...prev];
            const hit = next.findIndex((item) => item.seq === event.data.seq);
            if (hit >= 0) {
              next[hit] = event.data;
            } else {
              next.push(event.data);
            }
            return next;
          });
          if (event.data.message?.role === 'assistant') {
            setStreamingAssistantText('');
            setIsAwaitingAssistantOutput(false);
          }
        }
      });
      if (runId !== streamRunIdRef.current) {
        return;
      }
      setOptimisticUserEvent(null);
      if (result.sessionKey !== item.sessionKey) {
        setSelectedSessionKey(result.sessionKey);
      }
      await sessionsQuery.refetch();
      const activeSessionKey = selectedSessionKeyRef.current;
      if (!activeSessionKey || activeSessionKey === item.sessionKey || activeSessionKey === result.sessionKey) {
        await historyQuery.refetch();
      }
      setStreamingSessionEvents([]);
      setStreamingAssistantText('');
      setStreamingAssistantTimestamp(null);
      setIsAwaitingAssistantOutput(false);
      setIsSending(false);
    } catch {
      if (runId !== streamRunIdRef.current) {
        return;
      }
      streamRunIdRef.current += 1;
      setIsSending(false);
      setOptimisticUserEvent(null);
      setStreamingSessionEvents([]);
      setStreamingAssistantText('');
      setStreamingAssistantTimestamp(null);
      setIsAwaitingAssistantOutput(false);
      if (options?.restoreDraftOnError) {
        setDraft((prev) => prev.trim().length === 0 ? item.message : prev);
      }
    }
  }, [historyQuery, sessionsQuery]);

  useEffect(() => {
    if (isSending || queuedMessages.length === 0) {
      return;
    }
    const [next, ...rest] = queuedMessages;
    setQueuedMessages(rest);
    void runSend(next, { restoreDraftOnError: true });
  }, [isSending, queuedMessages, runSend]);

  const handleSend = async () => {
    const message = draft.trim();
    if (!message) {
      return;
    }

    const sessionKey = selectedSessionKey ?? buildNewSessionKey(selectedAgentId);
    if (!selectedSessionKey) {
      setSelectedSessionKey(sessionKey);
    }
    setDraft('');

    queueIdRef.current += 1;
    const item: PendingChatMessage = {
      id: queueIdRef.current,
      message,
      sessionKey,
      agentId: selectedAgentId
    };

    if (isSending) {
      setQueuedMessages((prev) => [...prev, item]);
      return;
    }

    await runSend(item, { restoreDraftOnError: true });
  };

  return (
    <PageLayout fullHeight>
      <PageHeader
        title={t('chatPageTitle')}
        description={t('chatPageDescription')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => historyQuery.refetch()} className="rounded-lg">
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', historyQuery.isFetching && 'animate-spin')} />
              {t('chatRefresh')}
            </Button>
            <Button variant="primary" size="sm" onClick={createNewSession} className="rounded-lg">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {t('chatNewSession')}
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 flex gap-4 max-lg:flex-col">
        <aside className="w-[320px] max-lg:w-full shrink-0 rounded-2xl border border-gray-200 bg-white shadow-card flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('chatSearchSessionPlaceholder')}
                className="pl-8 h-9 rounded-lg text-xs"
              />
            </div>
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="h-9 rounded-lg text-xs">
                <SelectValue placeholder={t('sessionsAllChannels')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('sessionsAllChannels')}</SelectItem>
                {channelOptions.map((channel) => (
                  <SelectItem key={channel} value={channel}>
                    {displayChannelName(channel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => sessionsQuery.refetch()}>
                <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', sessionsQuery.isFetching && 'animate-spin')} />
                {t('chatRefresh')}
              </Button>
              <Button variant="subtle" size="sm" className="rounded-lg" onClick={createNewSession}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {t('chatNewSession')}
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
            {sessionsQuery.isLoading ? (
              <div className="text-sm text-gray-500 p-4">{t('sessionsLoading')}</div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-5 m-2 rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-500">
                <MessageSquareText className="h-7 w-7 mx-auto mb-2 text-gray-300" />
                {t('sessionsEmpty')}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSessions.map((session) => {
                  const active = selectedSessionKey === session.key;
                  return (
                    <button
                      key={session.key}
                      onClick={() => setSelectedSessionKey(session.key)}
                      className={cn(
                        'w-full rounded-xl border px-3 py-2.5 text-left transition-all',
                        active
                          ? 'border-primary/30 bg-primary/5'
                          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <div className="text-sm font-semibold text-gray-900 truncate">{sessionDisplayName(session)}</div>
                      <div className="mt-1 text-[11px] text-gray-500 truncate">{session.key}</div>
                      <div className="mt-1 text-[11px] text-gray-400">
                        {session.messageCount} · {formatDateTime(session.updatedAt)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex-1 min-h-0 rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/60 to-white shadow-card flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200/80 bg-white/80 backdrop-blur-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,300px)_minmax(0,1fr)_auto] items-end">
              <div className="min-w-0">
              <div className="text-[11px] text-gray-500 mb-1">{t('chatAgentLabel')}</div>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder={t('chatSelectAgent')} />
                </SelectTrigger>
                <SelectContent>
                  {agentOptions.map((agent) => (
                    <SelectItem key={agent} value={agent}>
                      {agent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

              <div className="min-w-0">
              <div className="text-[11px] text-gray-500 mb-1">{t('chatSessionLabel')}</div>
              <div className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 flex items-center truncate">
                {selectedSessionKey ?? t('chatNoSession')}
              </div>
            </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={handleDeleteSession}
                disabled={!selectedSession || deleteSession.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {t('chatDeleteSession')}
              </Button>
            </div>
          </div>

          <div ref={threadRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-5">
            {!selectedSessionKey ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageSquareText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm font-medium">{t('chatNoSession')}</div>
                  <div className="text-xs mt-1">{t('chatNoSessionHint')}</div>
                </div>
              </div>
            ) : historyQuery.isLoading && mergedEvents.length === 0 && !isSending && !isAwaitingAssistantOutput && !streamingAssistantText.trim() ? (
              <div className="text-sm text-gray-500">{t('chatHistoryLoading')}</div>
            ) : (
              <>
                {mergedEvents.length === 0 ? (
                  <div className="text-sm text-gray-500">{t('chatNoMessages')}</div>
                ) : (
                  <ChatThread events={mergedEvents} isSending={isSending && isAwaitingAssistantOutput} />
                )}
              </>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            <div className="rounded-xl border border-gray-200 bg-white p-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={t('chatInputPlaceholder')}
                className="w-full min-h-[68px] max-h-[220px] resize-y bg-transparent outline-none text-sm px-2 py-1.5 text-gray-800 placeholder:text-gray-400"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="text-[11px] text-gray-400">
                  {isSending && queuedMessages.length > 0
                    ? `${t('chatQueuedHintPrefix')} ${queuedMessages.length} ${t('chatQueuedHintSuffix')}`
                    : t('chatInputHint')}
                </div>
                <Button
                  size="sm"
                  className="rounded-lg"
                  onClick={() => void handleSend()}
                  disabled={draft.trim().length === 0}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {isSending ? t('chatQueueSend') : t('chatSend')}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <ConfirmDialog />
    </PageLayout>
  );
}
