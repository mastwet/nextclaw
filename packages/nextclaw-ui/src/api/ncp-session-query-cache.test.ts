import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  applyNcpSessionRealtimeEvent,
  deleteNcpSessionSummaryList,
  upsertNcpSessionSummaryList
} from '@/api/ncp-session-query-cache';
import type { NcpSessionsListView } from '@/api/types';

function createSessionsList(): NcpSessionsListView {
  return {
    sessions: [
      {
        sessionId: 'session-1',
        messageCount: 1,
        updatedAt: '2026-03-29T10:00:00.000Z',
        status: 'idle',
        metadata: {}
      },
      {
        sessionId: 'session-2',
        messageCount: 2,
        updatedAt: '2026-03-29T09:00:00.000Z',
        status: 'idle',
        metadata: {}
      }
    ],
    total: 2
  };
}

describe('ncp-session-query-cache', () => {
  it('upserts summaries and keeps the list sorted by updatedAt descending', () => {
    const updated = upsertNcpSessionSummaryList(createSessionsList(), {
      sessionId: 'session-2',
      messageCount: 3,
      updatedAt: '2026-03-29T11:00:00.000Z',
      status: 'running',
      metadata: { label: 'Latest' }
    });

    expect(updated?.sessions.map((session) => session.sessionId)).toEqual(['session-2', 'session-1']);
    expect(updated?.sessions[0]).toMatchObject({
      sessionId: 'session-2',
      messageCount: 3,
      status: 'running'
    });
  });

  it('deletes summaries without mutating unrelated entries', () => {
    const updated = deleteNcpSessionSummaryList(createSessionsList(), 'session-1');

    expect(updated?.sessions.map((session) => session.sessionId)).toEqual(['session-2']);
    expect(updated?.total).toBe(1);
  });

  it('applies realtime upsert/delete events to every ncp-sessions query cache entry', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['ncp-sessions', 200], createSessionsList());

    applyNcpSessionRealtimeEvent(queryClient, {
      type: 'session.summary.upsert',
      payload: {
        summary: {
          sessionId: 'session-3',
          messageCount: 1,
          updatedAt: '2026-03-29T12:00:00.000Z',
          status: 'running',
          metadata: {}
        }
      }
    });

    expect(
      queryClient.getQueryData<NcpSessionsListView>(['ncp-sessions', 200])?.sessions.map((session) => session.sessionId)
    ).toEqual(['session-3', 'session-1', 'session-2']);

    applyNcpSessionRealtimeEvent(queryClient, {
      type: 'session.summary.delete',
      payload: {
        sessionKey: 'session-1'
      }
    });

    expect(
      queryClient.getQueryData<NcpSessionsListView>(['ncp-sessions', 200])?.sessions.map((session) => session.sessionId)
    ).toEqual(['session-3', 'session-2']);
  });
});
