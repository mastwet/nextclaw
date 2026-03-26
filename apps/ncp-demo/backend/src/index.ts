import { serve } from "@hono/node-server";
import { buildAssetContentPath } from "@nextclaw/ncp-agent-runtime";
import { createAgentClientFromServer } from "@nextclaw/ncp-toolkit";
import { mountNcpHttpAgentRoutes } from "@nextclaw/ncp-http-agent-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFile } from "node:fs/promises";
import { createDemoBackend } from "./backend.js";

const port = parsePort(process.env.NCP_DEMO_PORT, 3197);
const host = "127.0.0.1";

const { backend, assetStore } = createDemoBackend();
const agentClient = createAgentClientFromServer(backend);

const app = new Hono();
app.use("*", cors());

app.get("/health", (c) => {
  return c.json({ ok: true });
});

app.get("/demo/sessions", async (c) => {
  const sessions = await backend.listSessions();
  return c.json(sessions);
});

app.get("/demo/sessions/:sessionId/messages", async (c) => {
  const sessionId = c.req.param("sessionId");
  const messages = await backend.listSessionMessages(sessionId);
  return c.json(messages);
});

app.get("/demo/sessions/:sessionId/seed", async (c) => {
  const sessionId = c.req.param("sessionId");
  const [session, messages] = await Promise.all([
    backend.getSession(sessionId),
    backend.listSessionMessages(sessionId),
  ]);
  return c.json({
    messages,
    status: session?.status ?? "idle",
  });
});

app.delete("/demo/sessions/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  await backend.deleteSession(sessionId);
  return c.json({ ok: true });
});

app.post("/api/ncp/assets", async (c) => {
  const formData = await c.req.raw.formData();
  const files = Array.from(formData.values()).reduce<
    Array<{
      name: string;
      type: string;
      arrayBuffer: () => Promise<ArrayBuffer>;
    }>
  >((result, value) => {
    if (typeof value !== "string") {
      result.push(value as {
        name: string;
        type: string;
        arrayBuffer: () => Promise<ArrayBuffer>;
      });
    }
    return result;
  }, []);
  if (files.length === 0) {
    return c.json({ ok: false, error: { code: "INVALID_BODY", message: "no files provided" } }, 400);
  }

  const assets = [];
  for (const file of files) {
    const record = await assetStore.putBytes({
      fileName: file.name,
      mimeType: file.type || null,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    assets.push({
      id: record.id,
      name: record.fileName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      assetUri: record.uri,
      url: buildAssetContentPath({
        basePath: "/api/ncp/assets/content",
        assetUri: record.uri,
      }),
    });
  }

  return c.json({ ok: true, data: { assets } });
});

app.get("/api/ncp/assets/content", async (c) => {
  const uri = c.req.query("uri")?.trim();
  if (!uri) {
    return c.json({ ok: false, error: { code: "INVALID_URI", message: "asset uri is required" } }, 400);
  }

  const record = await assetStore.statRecord(uri);
  const contentPath = assetStore.resolveContentPath(uri);
  if (!record || !contentPath) {
    return c.json({ ok: false, error: { code: "NOT_FOUND", message: `asset not found: ${uri}` } }, 404);
  }

  const body = await readFile(contentPath);
  return new Response(body, {
    headers: {
      "content-length": String(body.byteLength),
      "content-type": record.mimeType,
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(record.fileName)}`,
    },
  });
});

mountNcpHttpAgentRoutes(app, {
  agentClientEndpoint: agentClient,
  streamProvider: backend,
});

await backend.start();

serve(
  {
    fetch: app.fetch,
    port,
    hostname: host,
  },
  (info) => {
    console.log(`[ncp-demo] server listening at http://${info.address}:${info.port}`);
  },
);

const shutdown = async () => {
  await backend.stop();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
