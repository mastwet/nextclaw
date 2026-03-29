import { useMemo } from 'react';
import type { SessionEntryView } from '@/api/types';
import { adaptNcpSessionSummaries } from '@/components/chat/ncp/ncp-session-adapter';
import { useChatSessionListStore } from '@/components/chat/stores/chat-session-list.store';
import { useNcpSessions } from '@/hooks/useConfig';
import type { SessionRunStatus } from '@/lib/session-run-status';

export type NcpSessionListItemView = {
  session: SessionEntryView;
  runStatus?: SessionRunStatus;
};

function filterSessionsByQuery(sessions: readonly SessionEntryView[], query: string): SessionEntryView[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [...sessions];
  }

  return sessions.filter((session) => session.key.toLowerCase().includes(normalizedQuery));
}

export function useNcpSessionListView(params: { limit?: number } = {}) {
  const query = useChatSessionListStore((state) => state.snapshot.query);
  const sessionsQuery = useNcpSessions({ limit: params.limit ?? 200 });

  const items = useMemo<NcpSessionListItemView[]>(() => {
    const summaries = sessionsQuery.data?.sessions ?? [];
    const sessions = adaptNcpSessionSummaries(summaries);
    const filteredSessions = filterSessionsByQuery(sessions, query);
    const summaryBySessionId = new Map(summaries.map((summary) => [summary.sessionId, summary]));

    return filteredSessions.map((session) => ({
      session,
      runStatus: summaryBySessionId.get(session.key)?.status === 'running' ? 'running' : undefined
    }));
  }, [query, sessionsQuery.data?.sessions]);

  return {
    isLoading: sessionsQuery.isLoading,
    items
  };
}
