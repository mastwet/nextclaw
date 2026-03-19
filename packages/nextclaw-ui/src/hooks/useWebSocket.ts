import { useEffect, useState } from 'react';
import { ConfigWebSocket } from '@/api/websocket';
import { API_BASE } from '@/api/client';
import { useUiStore } from '@/stores/ui.store';
import type { QueryClient } from '@tanstack/react-query';

function shouldInvalidateConfigQuery(configPath: string) {
  const normalized = configPath.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  if (normalized.startsWith('plugins') || normalized.startsWith('skills')) {
    return false;
  }
  return true;
}

function invalidateMarketplaceQueries(queryClient: QueryClient | undefined, configPath: string): void {
  if (configPath.startsWith('plugins')) {
    queryClient?.invalidateQueries({ queryKey: ['ncp-session-types'] });
    queryClient?.invalidateQueries({ queryKey: ['marketplace-installed', 'plugin'] });
    queryClient?.invalidateQueries({ queryKey: ['marketplace-items'] });
  }
  if (configPath.startsWith('mcp')) {
    queryClient?.invalidateQueries({ queryKey: ['marketplace-mcp-installed'] });
    queryClient?.invalidateQueries({ queryKey: ['marketplace-mcp-items'] });
    queryClient?.invalidateQueries({ queryKey: ['marketplace-mcp-doctor'] });
  }
}

export function useWebSocket(queryClient?: QueryClient) {
  const [ws, setWs] = useState<ConfigWebSocket | null>(null);
  const { setConnectionStatus } = useUiStore();

  useEffect(() => {
    const wsUrl = (() => {
      const base = API_BASE?.replace(/\/$/, '');
      if (!base) {
        return 'ws://127.0.0.1:18791/ws';
      }
      try {
        const resolved = new URL(base, window.location.origin);
        const protocol =
          resolved.protocol === 'https:'
            ? 'wss:'
            : resolved.protocol === 'http:'
              ? 'ws:'
              : resolved.protocol;
        return `${protocol}//${resolved.host}/ws`;
      } catch {
        if (base.startsWith('wss://') || base.startsWith('ws://')) {
          return `${base}/ws`;
        }
        if (base.startsWith('https://')) {
          return `${base.replace(/^https:/, 'wss:')}/ws`;
        }
        if (base.startsWith('http://')) {
          return `${base.replace(/^http:/, 'ws:')}/ws`;
        }
        return `${base}/ws`;
      }
    })();
    const client = new ConfigWebSocket(wsUrl);
    let isSocketOpen = false;

    const probeHealth = async (): Promise<boolean> => {
      const base = API_BASE?.replace(/\/$/, '') || window.location.origin;
      const url = `${base}/api/health`;
      try {
        const response = await fetch(url, { method: 'GET', cache: 'no-store' });
        if (!response.ok) {
          return false;
        }
        const payload = await response.json() as {
          ok?: boolean;
          data?: {
            status?: string;
          };
        };
        return payload.ok === true && payload.data?.status === 'ok';
      } catch {
        return false;
      }
    };

    const syncConnectionStatusFromHealth = async () => {
      if (isSocketOpen) {
        setConnectionStatus('connected');
        return;
      }
      const healthy = await probeHealth();
      setConnectionStatus(healthy ? 'connected' : 'disconnected');
    };

    const invalidateSessionQueries = (sessionKey?: string) => {
      if (!queryClient) {
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['ncp-sessions'] });
      if (sessionKey && sessionKey.trim().length > 0) {
        queryClient.invalidateQueries({ queryKey: ['session-history', sessionKey.trim()] });
        queryClient.invalidateQueries({ queryKey: ['ncp-session-messages', sessionKey.trim()] });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['session-history'] });
      queryClient.invalidateQueries({ queryKey: ['ncp-session-messages'] });
    };

    setConnectionStatus('connecting');

    client.on('connection.open', () => {
      isSocketOpen = true;
      setConnectionStatus('connected');
    });

    client.on('connection.close', () => {
      isSocketOpen = false;
      void syncConnectionStatusFromHealth();
    });

    client.on('connection.error', () => {
      isSocketOpen = false;
      void syncConnectionStatusFromHealth();
    });

    client.on('config.updated', (event) => {
      const payload = event.payload as { path?: unknown } | undefined;
      const configPath = typeof payload?.path === 'string' ? payload.path : '';
      // Trigger refetch of config
      if (queryClient && shouldInvalidateConfigQuery(configPath)) {
        queryClient.invalidateQueries({ queryKey: ['config'] });
      }
      if (configPath.startsWith('session')) {
        invalidateSessionQueries();
      }
      invalidateMarketplaceQueries(queryClient, configPath);
    });

    client.on('run.updated', (event) => {
      if (event.type !== 'run.updated') {
        return;
      }
      if (!queryClient) {
        return;
      }
      const sessionKey = event.payload.run.sessionKey;
      const runId = event.payload.run.runId;
      queryClient.invalidateQueries({ queryKey: ['chat-runs'] });
      if (sessionKey) {
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['session-history', sessionKey] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['session-history'] });
      }
      if (runId) {
        queryClient.invalidateQueries({ queryKey: ['chat-run', runId] });
      }
    });

    client.on('session.updated', (event) => {
      if (event.type !== 'session.updated') {
        return;
      }
      invalidateSessionQueries(event.payload.sessionKey);
    });

    client.on('error', (event) => {
      if (event.type === 'error') {
        console.error('WebSocket error:', event.payload.message);
      }
    });

    client.connect();
    setWs(client);
    void syncConnectionStatusFromHealth();
    const healthTimer = window.setInterval(() => {
      void syncConnectionStatusFromHealth();
    }, 10_000);

    return () => {
      window.clearInterval(healthTimer);
      isSocketOpen = false;
      client.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [setConnectionStatus, queryClient]);

  return ws;
}
