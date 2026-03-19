import { Agent, fetch as undiciFetch } from "undici";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { Config, McpTransportHttp, McpTransportSse, McpTransportStdio } from "@nextclaw/core";
import type { McpServerRecord } from "../types.js";

type McpClientHandle = {
  client: Client;
  transport: Transport;
};

function createClient(): Client {
  return new Client({
    name: "nextclaw-mcp-client",
    version: "0.1.0"
  });
}

function buildFetch(transport: McpTransportHttp | McpTransportSse): typeof fetch {
  const timeoutMs = transport.timeoutMs;
  const insecureAgent = transport.verifyTls ? null : new Agent({
    connect: {
      rejectUnauthorized: false
    }
  });

  return async (input, init) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await undiciFetch(input, {
        ...init,
        dispatcher: insecureAgent ?? (init as { dispatcher?: Agent } | undefined)?.dispatcher,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
  };
}

function createStdioTransport(transport: McpTransportStdio): Transport {
  return new StdioClientTransport({
    command: transport.command,
    args: transport.args,
    cwd: transport.cwd,
    env: Object.keys(transport.env).length > 0 ? transport.env : undefined,
    stderr: transport.stderr
  });
}

function createHttpTransport(transport: McpTransportHttp): Transport {
  return new StreamableHTTPClientTransport(new URL(transport.url), {
    requestInit: {
      headers: transport.headers
    },
    fetch: buildFetch(transport)
  });
}

function createSseTransport(transport: McpTransportSse): Transport {
  return new SSEClientTransport(new URL(transport.url), {
    requestInit: {
      headers: transport.headers
    },
    eventSourceInit: {
      fetch: buildFetch(transport),
      headers: transport.headers
    } as RequestInit & { fetch: typeof fetch },
    fetch: buildFetch(transport)
  });
}

export class McpClientFactory {
  constructor(private readonly _config?: Config) {
    void this._config;
  }

  create(record: McpServerRecord): McpClientHandle {
    const transport = (() => {
      switch (record.definition.transport.type) {
        case "stdio":
          return createStdioTransport(record.definition.transport);
        case "http":
          return createHttpTransport(record.definition.transport);
        case "sse":
          return createSseTransport(record.definition.transport);
        default:
          throw new Error(`Unsupported MCP transport: ${String((record.definition.transport as { type?: string }).type)}`);
      }
    })();

    return {
      client: createClient(),
      transport
    };
  }
}
