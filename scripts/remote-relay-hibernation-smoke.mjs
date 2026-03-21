#!/usr/bin/env node
import { createServer } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = resolve(rootDir, "workers/nextclaw-provider-gateway-api");
const workerConfig = resolve(workerDir, "wrangler.toml");
const wranglerBin = resolve(
  workerDir,
  "node_modules/.bin",
  process.platform === "win32" ? "wrangler.cmd" : "wrangler"
);
const nextclawCli = resolve(rootDir, "packages/nextclaw/dist/cli/index.js");

function runOrThrow(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: rootDir,
    encoding: "utf-8",
    stdio: "pipe",
    ...options
  });
  if (result.status !== 0) {
    throw new Error(
      `Command failed: ${cmd} ${args.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }
  return result;
}

function findFreePort() {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to allocate free port."));
        return;
      }
      const port = address.port;
      server.close(() => resolvePort(port));
    });
    server.on("error", reject);
  });
}

async function waitFor(check, timeoutMs, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await check();
    if (result) {
      return result;
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 300));
  }
  throw new Error(`Timeout while waiting for ${label}.`);
}

async function waitForHealth(url, timeoutMs = 30_000) {
  await waitFor(async () => {
    try {
      const response = await fetch(url);
      return response.ok ? true : false;
    } catch {
      return false;
    }
  }, timeoutMs, `health check ${url}`);
}

async function requestJson({
  method,
  url,
  token,
  body,
  expectedStatus,
  headers = {}
}) {
  const finalHeaders = new Headers(headers);
  if (!finalHeaders.has("Content-Type") && body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual"
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (typeof expectedStatus === "number" && response.status !== expectedStatus) {
    throw new Error(
      `Unexpected status for ${method} ${url}: expected ${expectedStatus}, got ${response.status}, body=${text}`
    );
  }
  return { status: response.status, body: parsed, headers: response.headers };
}

function extractCookie(setCookieHeader) {
  if (typeof setCookieHeader !== "string" || setCookieHeader.trim().length === 0) {
    throw new Error("Missing Set-Cookie header.");
  }
  const firstSegment = setCookieHeader.split(";")[0]?.trim();
  if (!firstSegment) {
    throw new Error(`Invalid Set-Cookie header: ${setCookieHeader}`);
  }
  return firstSegment;
}

function parseD1Results(stdout) {
  const parsed = JSON.parse(stdout);
  if (Array.isArray(parsed)) {
    const first = parsed[0];
    if (Array.isArray(first?.results)) {
      return first.results;
    }
  }
  if (Array.isArray(parsed?.results)) {
    return parsed.results;
  }
  throw new Error(`Unexpected D1 JSON output: ${stdout}`);
}

function queryLocalD1({ persistDir, sql }) {
  const result = runOrThrow(wranglerBin, [
    "d1",
    "execute",
    "NEXTCLAW_PLATFORM_DB",
    "--local",
    "--config",
    workerConfig,
    "--persist-to",
    persistDir,
    "--json",
    "--command",
    sql
  ]);
  return parseD1Results(result.stdout);
}

async function main() {
  const persistDir = mkdtempSync(resolve(tmpdir(), "nextclaw-remote-relay-smoke-"));
  const nextclawHome = mkdtempSync(resolve(tmpdir(), "nextclaw-remote-home-"));
  const envFile = resolve(persistDir, ".smoke.env");
  const backendPort = await findFreePort();
  const uiPort = await findFreePort();
  const base = `http://127.0.0.1:${backendPort}`;
  const apiBase = `${base}/v1`;
  const userEmail = `remote-smoke.${Date.now()}@example.com`;
  const password = "Passw0rd!";

  let workerProcess = null;
  let connectorProcess = null;
  let workerLogs = "";
  let connectorLogs = "";

  const localUiServer = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${uiPort}`);
    if (req.method === "GET" && url.pathname === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/auth/bridge") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        data: {
          cookie: "nextclaw_ui_bridge=smoke-bridge"
        }
      }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/probe") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        path: url.pathname,
        search: url.search,
        cookie: req.headers.cookie ?? ""
      }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end("<html><body>remote-smoke-ok</body></html>");
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found", path: url.pathname }));
  });

  await new Promise((resolveListen, rejectListen) => {
    localUiServer.once("error", rejectListen);
    localUiServer.listen(uiPort, "127.0.0.1", () => resolveListen());
  });

  writeFileSync(
    envFile,
    [
      "AUTH_TOKEN_SECRET=smoke-token-secret-with-length-at-least-32",
      "DASHSCOPE_API_KEY=smoke-upstream-key",
      "DASHSCOPE_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1",
      "GLOBAL_FREE_USD_LIMIT=20",
      "REQUEST_FLAT_USD_PER_REQUEST=0.0002"
    ].join("\n"),
    "utf-8"
  );

  try {
    console.log("[remote-relay-smoke] apply local migrations...");
    runOrThrow(wranglerBin, [
      "d1",
      "migrations",
      "apply",
      "NEXTCLAW_PLATFORM_DB",
      "--local",
      "--config",
      workerConfig,
      "--persist-to",
      persistDir
    ]);

    console.log("[remote-relay-smoke] start worker...");
    workerProcess = spawn(
      wranglerBin,
      [
        "dev",
        "--local",
        "--port",
        String(backendPort),
        "--config",
        workerConfig,
        "--env-file",
        envFile,
        "--persist-to",
        persistDir
      ],
      {
        cwd: rootDir,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    const captureWorkerLog = (chunk) => {
      workerLogs = `${workerLogs}${String(chunk ?? "")}`.slice(-20_000);
    };
    workerProcess.stdout?.on("data", captureWorkerLog);
    workerProcess.stderr?.on("data", captureWorkerLog);

    await waitForHealth(`${base}/health`);

    console.log("[remote-relay-smoke] build affected CLI...");
    runOrThrow("pnpm", ["-C", "packages/nextclaw", "build"]);

    console.log("[remote-relay-smoke] login via nextclaw CLI...");
    runOrThrow("node", [
      nextclawCli,
      "login",
      "--api-base",
      apiBase,
      "--email",
      userEmail,
      "--password",
      password,
      "--register"
    ], {
      env: {
        ...process.env,
        NEXTCLAW_HOME: nextclawHome
      }
    });

    const userLogin = await requestJson({
      method: "POST",
      url: `${base}/platform/auth/login`,
      body: { email: userEmail, password },
      expectedStatus: 200
    });
    const userToken = userLogin.body?.data?.token;
    if (!userToken) {
      throw new Error("Missing user token after login.");
    }

    console.log("[remote-relay-smoke] start real connector...");
    connectorProcess = spawn(
      "node",
      [
        nextclawCli,
        "remote",
        "connect",
        "--api-base",
        apiBase,
        "--local-origin",
        `http://127.0.0.1:${uiPort}`,
        "--name",
        "remote-hibernation-smoke",
        "--once"
      ],
      {
        cwd: rootDir,
        env: {
          ...process.env,
          NEXTCLAW_HOME: nextclawHome
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    const captureConnectorLog = (chunk) => {
      connectorLogs = `${connectorLogs}${String(chunk ?? "")}`.slice(-20_000);
    };
    connectorProcess.stdout?.on("data", captureConnectorLog);
    connectorProcess.stderr?.on("data", captureConnectorLog);

    const device = await waitFor(async () => {
      const devicesResponse = await requestJson({
        method: "GET",
        url: `${base}/platform/remote/devices`,
        token: userToken,
        expectedStatus: 200
      });
      const items = devicesResponse.body?.data?.items ?? [];
      return items.find((item) => item.displayName === "remote-hibernation-smoke" && item.status === "online") ?? null;
    }, 30_000, "connector online");

    console.log("[remote-relay-smoke] verify no heartbeat writes after idle...");
    const [deviceRowBeforeIdle] = queryLocalD1({
      persistDir,
      sql: `SELECT status, last_seen_at, updated_at FROM remote_devices WHERE id = '${device.id}'`
    });
    if (!deviceRowBeforeIdle || deviceRowBeforeIdle.status !== "online") {
      throw new Error(`Expected online remote device row, got ${JSON.stringify(deviceRowBeforeIdle)}`);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 18_000));
    const [deviceRowAfterIdle] = queryLocalD1({
      persistDir,
      sql: `SELECT status, last_seen_at, updated_at FROM remote_devices WHERE id = '${device.id}'`
    });
    if (!deviceRowAfterIdle || deviceRowAfterIdle.status !== "online") {
      throw new Error(`Expected online remote device row after idle, got ${JSON.stringify(deviceRowAfterIdle)}`);
    }
    if (
      deviceRowAfterIdle.last_seen_at !== deviceRowBeforeIdle.last_seen_at
      || deviceRowAfterIdle.updated_at !== deviceRowBeforeIdle.updated_at
    ) {
      throw new Error(
        `Expected no heartbeat-driven DB writes while idle, before=${JSON.stringify(deviceRowBeforeIdle)}, after=${JSON.stringify(deviceRowAfterIdle)}`
      );
    }

    console.log("[remote-relay-smoke] open remote session and verify local bridge...");
    const openSession = await requestJson({
      method: "POST",
      url: `${base}/platform/remote/devices/${encodeURIComponent(device.id)}/open`,
      token: userToken,
      body: {},
      expectedStatus: 200
    });
    const openUrl = openSession.body?.data?.openUrl;
    const sessionCreatedAt = openSession.body?.data?.lastUsedAt;
    if (!openUrl) {
      throw new Error(`Missing openUrl in session response: ${JSON.stringify(openSession.body)}`);
    }
    if (!sessionCreatedAt) {
      throw new Error(`Missing lastUsedAt in session response: ${JSON.stringify(openSession.body)}`);
    }
    const localOpenUrl = new URL(openUrl);
    localOpenUrl.protocol = "http:";
    localOpenUrl.host = `127.0.0.1:${backendPort}`;
    const redirectResponse = await fetch(localOpenUrl, { redirect: "manual" });
    if (redirectResponse.status !== 302) {
      throw new Error(
        `Expected redirect status 302, got ${redirectResponse.status}, openUrl=${openUrl}, localOpenUrl=${localOpenUrl}, body=${await redirectResponse.text()}`
      );
    }
    const remoteSessionCookie = extractCookie(redirectResponse.headers.get("set-cookie"));
    const proxiedProbe = await requestJson({
      method: "GET",
      url: `${base}/probe?hit=1`,
      expectedStatus: 200,
      headers: { cookie: remoteSessionCookie }
    });
    if (!String(proxiedProbe.body?.cookie ?? "").includes("nextclaw_ui_bridge=smoke-bridge")) {
      throw new Error(`Expected bridged local auth cookie, got ${JSON.stringify(proxiedProbe.body)}`);
    }

    const secondProxy = await requestJson({
      method: "GET",
      url: `${base}/probe?hit=2`,
      expectedStatus: 200,
      headers: { cookie: remoteSessionCookie }
    });
    if (!secondProxy.body?.ok) {
      throw new Error(`Second proxied request failed: ${JSON.stringify(secondProxy.body)}`);
    }
    const [sessionRowAfterProxies] = queryLocalD1({
      persistDir,
      sql: "SELECT id, last_used_at, updated_at FROM remote_sessions ORDER BY created_at DESC LIMIT 1"
    });
    if (!sessionRowAfterProxies) {
      throw new Error("Missing remote session row after proxied requests.");
    }
    if (sessionRowAfterProxies.last_used_at !== sessionCreatedAt) {
      throw new Error(
        `Expected throttled session touch, sessionCreatedAt=${sessionCreatedAt}, row=${JSON.stringify(sessionRowAfterProxies)}`
      );
    }

    console.log("[remote-relay-smoke] stop connector and verify offline transition...");
    if (connectorProcess.exitCode === null && !connectorProcess.killed) {
      connectorProcess.kill("SIGTERM");
    }
    await waitFor(async () => {
      const devicesResponse = await requestJson({
        method: "GET",
        url: `${base}/platform/remote/devices`,
        token: userToken,
        expectedStatus: 200
      });
      const items = devicesResponse.body?.data?.items ?? [];
      return items.find((item) => item.id === device.id && item.status === "offline") ?? null;
    }, 30_000, "connector offline");

    console.log("[remote-relay-smoke] all checks passed.");
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}`
      + `\n[worker logs]\n${workerLogs}`
      + `\n[connector logs]\n${connectorLogs}`
    );
  } finally {
    if (connectorProcess && connectorProcess.exitCode === null && !connectorProcess.killed) {
      connectorProcess.kill("SIGTERM");
      await new Promise((resolveWait) => setTimeout(resolveWait, 800));
      if (connectorProcess.exitCode === null && !connectorProcess.killed) {
        connectorProcess.kill("SIGKILL");
      }
    }
    if (workerProcess && workerProcess.exitCode === null && !workerProcess.killed) {
      workerProcess.kill("SIGTERM");
      await new Promise((resolveWait) => setTimeout(resolveWait, 800));
      if (workerProcess.exitCode === null && !workerProcess.killed) {
        workerProcess.kill("SIGKILL");
      }
    }
    await new Promise((resolveClose) => localUiServer.close(() => resolveClose()));
    rmSync(persistDir, { recursive: true, force: true });
    rmSync(nextclawHome, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("[remote-relay-smoke] failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
