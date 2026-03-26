import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHydratedNcpAgent } from '../../../../ncp-packages/nextclaw-ncp-react/src/hooks/use-hydrated-ncp-agent.ts';

const mocks = vi.hoisted(() => ({
  manager: {
    reset: vi.fn(),
    hydrate: vi.fn()
  },
  runtime: {
    snapshot: {
      messages: [],
      streamingMessage: null,
      activeRun: null,
      error: null
    },
    visibleMessages: [],
    activeRunId: null,
    isRunning: false,
    isSending: false,
    send: vi.fn(),
    abort: vi.fn(),
    streamRun: vi.fn()
  }
}));

vi.mock('../../../../ncp-packages/nextclaw-ncp-react/src/hooks/use-ncp-agent-runtime.js', () => ({
  useScopedAgentManager: () => mocks.manager,
  useNcpAgentRuntime: () => mocks.runtime
}));

describe('useHydratedNcpAgent', () => {
  beforeEach(() => {
    mocks.manager.reset.mockReset();
    mocks.manager.hydrate.mockReset();
    mocks.runtime.send.mockReset();
    mocks.runtime.abort.mockReset();
    mocks.runtime.streamRun.mockReset();
  });

  it('treats a newly selected session as hydrating immediately on rerender', async () => {
    const client = {
      stop: vi.fn().mockResolvedValue(undefined),
      stream: vi.fn().mockResolvedValue(undefined)
    } as never;
    const loadSeed = vi
      .fn()
      .mockResolvedValueOnce({ messages: [], status: 'idle' })
      .mockResolvedValueOnce({ messages: [], status: 'idle' });

    const { result, rerender } = renderHook(
      ({ sessionId }: { sessionId: string }) =>
        useHydratedNcpAgent({
          sessionId,
          client,
          loadSeed
        }),
      {
        initialProps: {
          sessionId: 'session-a'
        }
      }
    );

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });

    rerender({ sessionId: 'session-b' });

    expect(result.current.isHydrating).toBe(true);

    await waitFor(() => {
      expect(result.current.isHydrating).toBe(false);
    });
  });
});
