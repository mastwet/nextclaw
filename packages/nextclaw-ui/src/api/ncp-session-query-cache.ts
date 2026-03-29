import type { QueryClient } from '@tanstack/react-query';
import type { NcpSessionSummaryView, NcpSessionsListView, WsEvent } from '@/api/types';

function sortSessionSummaries(summaries: readonly NcpSessionSummaryView[]): NcpSessionSummaryView[] {
  return [...summaries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function upsertNcpSessionSummaryList(
  current: NcpSessionsListView | undefined,
  summary: NcpSessionSummaryView
): NcpSessionsListView | undefined {
  if (!current) {
    return current;
  }

  const existingIndex = current.sessions.findIndex((session) => session.sessionId === summary.sessionId);
  const nextSessions =
    existingIndex >= 0
      ? current.sessions.map((session, index) => (index === existingIndex ? summary : session))
      : [...current.sessions, summary];
  const sortedSessions = sortSessionSummaries(nextSessions);

  return {
    ...current,
    sessions: sortedSessions,
    total: sortedSessions.length
  };
}

export function deleteNcpSessionSummaryList(
  current: NcpSessionsListView | undefined,
  sessionKey: string
): NcpSessionsListView | undefined {
  if (!current) {
    return current;
  }

  const normalizedSessionKey = sessionKey.trim();
  if (!normalizedSessionKey) {
    return current;
  }

  const nextSessions = current.sessions.filter((session) => session.sessionId !== normalizedSessionKey);
  if (nextSessions.length === current.sessions.length) {
    return current;
  }

  return {
    ...current,
    sessions: nextSessions,
    total: nextSessions.length
  };
}

export function upsertNcpSessionSummaryInQueryClient(
  queryClient: QueryClient | undefined,
  summary: NcpSessionSummaryView
): void {
  queryClient?.setQueriesData<NcpSessionsListView>(
    { queryKey: ['ncp-sessions'] },
    (current) => upsertNcpSessionSummaryList(current, summary)
  );
}

export function deleteNcpSessionSummaryInQueryClient(
  queryClient: QueryClient | undefined,
  sessionKey: string
): void {
  queryClient?.setQueriesData<NcpSessionsListView>(
    { queryKey: ['ncp-sessions'] },
    (current) => deleteNcpSessionSummaryList(current, sessionKey)
  );
}

export function applyNcpSessionRealtimeEvent(
  queryClient: QueryClient | undefined,
  event: Extract<WsEvent, { type: 'session.summary.upsert' | 'session.summary.delete' }>
): void {
  if (event.type === 'session.summary.upsert') {
    upsertNcpSessionSummaryInQueryClient(queryClient, event.payload.summary);
    return;
  }

  deleteNcpSessionSummaryInQueryClient(queryClient, event.payload.sessionKey);
}
