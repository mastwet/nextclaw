import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionEntryView } from '@/api/types';
import {
  useChatCapabilities,
  useConfig,
  useConfigMeta,
  useDeleteSession,
  useSessionHistory,
  useSessions
} from '@/hooks/useConfig';
import { useMarketplaceInstalled } from '@/hooks/useMarketplace';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import type { ChatModelOption } from '@/components/chat/ChatInputBar';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatConversationPanel } from '@/components/chat/ChatConversationPanel';
import { CronConfig } from '@/components/config/CronConfig';
import { MarketplacePage } from '@/components/marketplace/MarketplacePage';
import { useChatStreamController } from '@/components/chat/useChatStreamController';
import { buildFallbackEventsFromMessages } from '@/lib/chat-message';
import { buildProviderModelCatalog, composeProviderModel } from '@/lib/provider-models';
import { t } from '@/lib/i18n';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const SESSION_ROUTE_PREFIX = 'sid_';

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

function encodeSessionRouteId(sessionKey: string): string {
  const bytes = new TextEncoder().encode(sessionKey);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `${SESSION_ROUTE_PREFIX}${base64}`;
}

function decodeSessionRouteId(routeValue: string): string | null {
  if (!routeValue.startsWith(SESSION_ROUTE_PREFIX)) {
    return null;
  }
  const encoded = routeValue.slice(SESSION_ROUTE_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
  const padding = encoded.length % 4 === 0 ? '' : '='.repeat(4 - (encoded.length % 4));
  try {
    const binary = atob(encoded + padding);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function parseSessionKeyFromRoute(routeValue?: string): string | null {
  if (!routeValue) {
    return null;
  }
  const decodedToken = decodeSessionRouteId(routeValue);
  if (decodedToken) {
    return decodedToken;
  }
  try {
    return decodeURIComponent(routeValue);
  } catch {
    return routeValue;
  }
}

function buildSessionPath(sessionKey: string): string {
  return `/chat/${encodeSessionRouteId(sessionKey)}`;
}

function sessionDisplayName(session: SessionEntryView): string {
  if (session.label && session.label.trim()) {
    return session.label.trim();
  }
  const chunks = session.key.split(':');
  return chunks[chunks.length - 1] || session.key;
}

type MainPanelView = 'chat' | 'cron' | 'skills';

type ChatPageProps = {
  view: MainPanelView;
};

export function ChatPage({ view }: ChatPageProps) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('main');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const { confirm, ConfirmDialog } = useConfirmDialog();
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId: routeSessionIdParam } = useParams<{ sessionId?: string }>();
  const threadRef = useRef<HTMLDivElement | null>(null);
  const isUserScrollingRef = useRef(false);
  const selectedSessionKeyRef = useRef<string | null>(selectedSessionKey);
  const routeSessionKey = useMemo(
    () => parseSessionKeyFromRoute(routeSessionIdParam),
    [routeSessionIdParam]
  );

  const configQuery = useConfig();
  const configMetaQuery = useConfigMeta();
  const sessionsQuery = useSessions({ q: query.trim() || undefined, limit: 120, activeMinutes: 0 });
  const installedSkillsQuery = useMarketplaceInstalled('skill');
  const chatCapabilitiesQuery = useChatCapabilities({
    sessionKey: selectedSessionKey,
    agentId: selectedAgentId
  });
  const historyQuery = useSessionHistory(selectedSessionKey, 300);
  const deleteSession = useDeleteSession();

  const modelOptions = useMemo<ChatModelOption[]>(() => {
    const providers = buildProviderModelCatalog({
      meta: configMetaQuery.data,
      config: configQuery.data,
      onlyConfigured: true
    });
    const seen = new Set<string>();
    const options: ChatModelOption[] = [];
    for (const provider of providers) {
      for (const localModel of provider.models) {
        const value = composeProviderModel(provider.prefix, localModel);
        if (!value || seen.has(value)) {
          continue;
        }
        seen.add(value);
        options.push({
          value,
          modelLabel: localModel,
          providerLabel: provider.displayName
        });
      }
    }
    return options.sort((left, right) => {
      const providerCompare = left.providerLabel.localeCompare(right.providerLabel);
      if (providerCompare !== 0) {
        return providerCompare;
      }
      return left.modelLabel.localeCompare(right.modelLabel);
    });
  }, [configMetaQuery.data, configQuery.data]);

  const sessions = useMemo(() => sessionsQuery.data?.sessions ?? [], [sessionsQuery.data?.sessions]);
  const skillRecords = useMemo(() => installedSkillsQuery.data?.records ?? [], [installedSkillsQuery.data?.records]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.key === selectedSessionKey) ?? null,
    [selectedSessionKey, sessions]
  );

  useEffect(() => {
    if (modelOptions.length === 0) {
      setSelectedModel('');
      return;
    }
    setSelectedModel((prev) => {
      if (modelOptions.some((option) => option.value === prev)) {
        return prev;
      }
      const sessionPreferred = selectedSession?.preferredModel?.trim();
      if (sessionPreferred && modelOptions.some((option) => option.value === sessionPreferred)) {
        return sessionPreferred;
      }
      const fallback = configQuery.data?.agents.defaults.model?.trim();
      if (fallback && modelOptions.some((option) => option.value === fallback)) {
        return fallback;
      }
      return modelOptions[0]?.value ?? '';
    });
  }, [configQuery.data?.agents.defaults.model, modelOptions, selectedSession?.preferredModel]);

  const historyData = historyQuery.data;
  const historyMessages = historyData?.messages ?? [];
  const historyEvents =
    historyData?.events && historyData.events.length > 0
      ? historyData.events
      : buildFallbackEventsFromMessages(historyMessages);
  const nextOptimisticUserSeq = useMemo(
    () => historyEvents.reduce((max, event) => (Number.isFinite(event.seq) ? Math.max(max, event.seq) : max), 0) + 1,
    [historyEvents]
  );

  const {
    optimisticUserEvent,
    streamingSessionEvents,
    streamingAssistantText,
    streamingAssistantTimestamp,
    isSending,
    isAwaitingAssistantOutput,
    queuedCount,
    canStopCurrentRun,
    stopDisabledReason,
    lastSendError,
    sendMessage,
    stopCurrentRun,
    resetStreamState
  } = useChatStreamController({
    nextOptimisticUserSeq,
    selectedSessionKeyRef,
    setSelectedSessionKey,
    setDraft,
    refetchSessions: sessionsQuery.refetch,
    refetchHistory: historyQuery.refetch
  });

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
    if (view !== 'chat') {
      return;
    }
    if (routeSessionKey) {
      if (selectedSessionKey !== routeSessionKey) {
        setSelectedSessionKey(routeSessionKey);
      }
      return;
    }
    if (selectedSessionKey !== null) {
      setSelectedSessionKey(null);
      resetStreamState();
    }
  }, [resetStreamState, routeSessionKey, selectedSessionKey, view]);

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
    isUserScrollingRef.current = false;
  }, [selectedSessionKey]);

  const isNearBottom = useCallback(() => {
    const element = threadRef.current;
    if (!element) return true;
    const threshold = 50;
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
  }, []);

  const handleScroll = useCallback(() => {
    if (isNearBottom()) {
      isUserScrollingRef.current = false;
    } else {
      isUserScrollingRef.current = true;
    }
  }, [isNearBottom]);

  useEffect(() => {
    const element = threadRef.current;
    if (!element || isUserScrollingRef.current) {
      return;
    }
    element.scrollTop = element.scrollHeight;
  }, [mergedEvents, isSending]);

  const createNewSession = useCallback(() => {
    resetStreamState();
    setSelectedSessionKey(null);
    if (location.pathname !== '/chat') {
      navigate('/chat');
    }
  }, [location.pathname, navigate, resetStreamState]);

  const handleDeleteSession = useCallback(async () => {
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
          resetStreamState();
          setSelectedSessionKey(null);
          navigate('/chat', { replace: true });
          await sessionsQuery.refetch();
        }
      }
    );
  }, [confirm, deleteSession, navigate, resetStreamState, selectedSessionKey, sessionsQuery]);

  const handleSend = useCallback(async () => {
    const message = draft.trim();
    if (!message) {
      return;
    }
    const requestedSkills = selectedSkills;

    const sessionKey = selectedSessionKey ?? buildNewSessionKey(selectedAgentId);
    if (!selectedSessionKey) {
      navigate(buildSessionPath(sessionKey), { replace: true });
    }
    setDraft('');
    setSelectedSkills([]);
    await sendMessage({
      message,
      sessionKey,
      agentId: selectedAgentId,
      model: selectedModel || undefined,
      stopSupported: chatCapabilitiesQuery.data?.stopSupported ?? false,
      stopReason: chatCapabilitiesQuery.data?.stopReason,
      requestedSkills,
      restoreDraftOnError: true
    });
  }, [
    chatCapabilitiesQuery.data?.stopReason,
    chatCapabilitiesQuery.data?.stopSupported,
    draft,
    selectedAgentId,
    selectedModel,
    navigate,
    selectedSessionKey,
    selectedSkills,
    sendMessage
  ]);

  const currentSessionDisplayName = selectedSession ? sessionDisplayName(selectedSession) : undefined;
  const handleSelectSession = useCallback((nextSessionKey: string) => {
    const target = buildSessionPath(nextSessionKey);
    if (location.pathname !== target) {
      navigate(target);
    }
  }, [location.pathname, navigate]);

  return (
    <div className="h-full flex">
      {/* Unified Chat Sidebar */}
      <ChatSidebar
        sessions={sessions}
        selectedSessionKey={selectedSessionKey}
        onSelectSession={handleSelectSession}
        onCreateSession={createNewSession}
        sessionTitle={sessionDisplayName}
        isLoading={sessionsQuery.isLoading}
        query={query}
        onQueryChange={setQuery}
      />

      {view === 'chat' ? (
        <ChatConversationPanel
          modelOptions={modelOptions}
          selectedModel={selectedModel}
          onSelectedModelChange={setSelectedModel}
          skillRecords={skillRecords}
          isSkillsLoading={installedSkillsQuery.isLoading}
          selectedSkills={selectedSkills}
          onSelectedSkillsChange={setSelectedSkills}
          selectedSessionKey={selectedSessionKey}
          sessionDisplayName={currentSessionDisplayName}
          canDeleteSession={Boolean(selectedSession)}
          isDeletePending={deleteSession.isPending}
          onDeleteSession={() => {
            void handleDeleteSession();
          }}
          onCreateSession={createNewSession}
          threadRef={threadRef}
          onThreadScroll={handleScroll}
          isHistoryLoading={historyQuery.isLoading}
          mergedEvents={mergedEvents}
          isSending={isSending}
          isAwaitingAssistantOutput={isAwaitingAssistantOutput}
          streamingAssistantText={streamingAssistantText}
          draft={draft}
          onDraftChange={setDraft}
          onSend={handleSend}
          onStop={() => {
            void stopCurrentRun();
          }}
          canStopGeneration={canStopCurrentRun}
          stopDisabledReason={stopDisabledReason}
          sendError={lastSendError}
          queuedCount={queuedCount}
        />
      ) : (
        <section className="flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-gray-50/60 to-white">
          <div className="h-full overflow-auto custom-scrollbar">
            <div className="mx-auto w-full max-w-[min(1120px,100%)] px-6 py-5">
              {view === 'cron' ? <CronConfig /> : <MarketplacePage forcedType="skills" />}
            </div>
          </div>
        </section>
      )}

      <ConfirmDialog />
    </div>
  );
}
