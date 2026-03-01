import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigSchema, LiteLLMProvider, saveConfig } from "@nextclaw/core";
import { createUiRouter } from "./router.js";

const tempDirs: string[] = [];

function createTempConfigPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "nextclaw-ui-provider-test-"));
  tempDirs.push(dir);
  return join(dir, "config.json");
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("provider connection test route", () => {
  it("returns 404 for unknown provider", async () => {
    const configPath = createTempConfigPath();
    saveConfig(ConfigSchema.parse({}), configPath);

    const app = createUiRouter({
      configPath,
      publish: () => {}
    });

    const response = await app.request("http://localhost/api/config/providers/not-exists/test", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });

    expect(response.status).toBe(404);
    const payload = await response.json() as {
      ok: false;
      error: {
        code: string;
      };
    };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("NOT_FOUND");
  });

  it("returns a failed result when api key is explicitly empty", async () => {
    const configPath = createTempConfigPath();
    saveConfig(ConfigSchema.parse({}), configPath);

    const app = createUiRouter({
      configPath,
      publish: () => {}
    });

    const response = await app.request("http://localhost/api/config/providers/openai/test", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        apiKey: ""
      })
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      ok: true;
      data: {
        success: boolean;
        message: string;
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.success).toBe(false);
    expect(payload.data.message).toContain("API key is required");
  });

  it("uses maxTokens >= 16 when probing provider connection", async () => {
    const configPath = createTempConfigPath();
    saveConfig(ConfigSchema.parse({}), configPath);

    const chatSpy = vi.spyOn(LiteLLMProvider.prototype, "chat").mockResolvedValue({
      content: "pong",
      toolCalls: [],
      finishReason: "stop",
      usage: {}
    });

    const app = createUiRouter({
      configPath,
      publish: () => {}
    });

    const response = await app.request("http://localhost/api/config/providers/openai/test", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        apiKey: "sk_test_probe",
        model: "gpt-5.2-codex"
      })
    });

    expect(response.status).toBe(200);
    const payload = await response.json() as {
      ok: true;
      data: {
        success: boolean;
      };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.success).toBe(true);
    expect(chatSpy).toHaveBeenCalledTimes(1);
    expect(chatSpy.mock.calls[0]?.[0]?.maxTokens).toBeGreaterThanOrEqual(16);
  });

  it("persists provider custom models and exposes provider default models in meta", async () => {
    const configPath = createTempConfigPath();
    saveConfig(ConfigSchema.parse({}), configPath);

    const app = createUiRouter({
      configPath,
      publish: () => {}
    });

    const updateResponse = await app.request("http://localhost/api/config/providers/deepseek", {
      method: "PUT",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        models: [" deepseek-chat ", "deepseek/deepseek-reasoner", "deepseek-chat", ""]
      })
    });
    expect(updateResponse.status).toBe(200);
    const updatePayload = await updateResponse.json() as {
      ok: true;
      data: {
        models?: string[];
      };
    };
    expect(updatePayload.ok).toBe(true);
    expect(updatePayload.data.models).toEqual(["deepseek-chat", "deepseek/deepseek-reasoner"]);

    const configResponse = await app.request("http://localhost/api/config");
    expect(configResponse.status).toBe(200);
    const configPayload = await configResponse.json() as {
      ok: true;
      data: {
        providers: Record<string, { models?: string[] }>;
      };
    };
    expect(configPayload.data.providers.deepseek.models).toEqual(["deepseek-chat", "deepseek/deepseek-reasoner"]);

    const metaResponse = await app.request("http://localhost/api/config/meta");
    expect(metaResponse.status).toBe(200);
    const metaPayload = await metaResponse.json() as {
      ok: true;
      data: {
        providers: Array<{
          name: string;
          defaultModels?: string[];
        }>;
      };
    };
    const deepseekSpec = metaPayload.data.providers.find((provider) => provider.name === "deepseek");
    expect(deepseekSpec?.defaultModels?.length ?? 0).toBeGreaterThan(0);
    expect(deepseekSpec?.defaultModels).toContain("deepseek/deepseek-chat");
  });

  it("supports creating, renaming, and deleting custom providers", async () => {
    const configPath = createTempConfigPath();
    saveConfig(ConfigSchema.parse({}), configPath);

    const app = createUiRouter({
      configPath,
      publish: () => {}
    });

    const createResponse = await app.request("http://localhost/api/config/providers", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        displayName: "Relay A",
        apiBase: "https://relay-b.example.com/v1"
      })
    });
    expect(createResponse.status).toBe(200);
    const createPayload = await createResponse.json() as {
      ok: true;
      data: {
        name: string;
      };
    };
    const customProviderName = createPayload.data.name;
    expect(customProviderName).toBe("custom-1");

    const updateResponse = await app.request(`http://localhost/api/config/providers/${customProviderName}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        displayName: "Relay B"
      })
    });
    expect(updateResponse.status).toBe(200);

    const configResponse = await app.request("http://localhost/api/config");
    expect(configResponse.status).toBe(200);
    const configPayload = await configResponse.json() as {
      ok: true;
      data: {
        providers: Record<string, { displayName?: string; apiBase?: string | null }>;
      };
    };
    expect(configPayload.data.providers[customProviderName]?.displayName).toBe("Relay B");
    expect(configPayload.data.providers[customProviderName]?.apiBase).toBe("https://relay-b.example.com/v1");

    const metaResponse = await app.request("http://localhost/api/config/meta");
    expect(metaResponse.status).toBe(200);
    const metaPayload = await metaResponse.json() as {
      ok: true;
      data: {
        providers: Array<{
          name: string;
          displayName?: string;
          isCustom?: boolean;
        }>;
      };
    };

    expect(metaPayload.data.providers[0]?.isCustom).toBe(true);
    expect(metaPayload.data.providers[0]?.name).toBe(customProviderName);
    const customSpec = metaPayload.data.providers.find((provider) => provider.name === customProviderName);
    expect(customSpec?.displayName).toBe("Relay B");
    expect(customSpec?.isCustom).toBe(true);

    const deleteResponse = await app.request(`http://localhost/api/config/providers/${customProviderName}`, {
      method: "DELETE"
    });
    expect(deleteResponse.status).toBe(200);

    const configAfterDelete = await app.request("http://localhost/api/config");
    expect(configAfterDelete.status).toBe(200);
    const configAfterDeletePayload = await configAfterDelete.json() as {
      ok: true;
      data: {
        providers: Record<string, { displayName?: string }>;
      };
    };
    expect(configAfterDeletePayload.data.providers[customProviderName]).toBeUndefined();
  });
});
