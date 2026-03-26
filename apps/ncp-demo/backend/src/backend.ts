import {
  DefaultNcpAgentRuntime,
  DefaultNcpContextBuilder,
  DefaultNcpToolRegistry,
  LocalAssetStore,
} from "@nextclaw/ncp-agent-runtime";
import {
  DefaultNcpAgentBackend,
} from "@nextclaw/ncp-toolkit";
import { join, resolve } from "node:path";
import { createClockTool } from "./tools/clock-tool.js";
import { createSleepTool } from "./tools/sleep-tool.js";
import { createLlmApi } from "./llm/create-llm-api.js";
import { FileAgentSessionStore } from "./stores/file-agent-session-store.js";

export function createDemoBackend(): {
  backend: DefaultNcpAgentBackend;
  assetStore: LocalAssetStore;
} {
  const llmApi = createLlmApi();
  const storeDir = resolveStoreDir(process.env.NCP_DEMO_STORE_DIR);
  const assetStore = new LocalAssetStore({
    rootDir: join(storeDir, "assets"),
  });
  return {
    assetStore,
    backend: new DefaultNcpAgentBackend({
      endpointId: "ncp-demo-agent",
      sessionStore: new FileAgentSessionStore({ baseDir: storeDir }),
      createRuntime: ({ stateManager }) => {
        const toolRegistry = new DefaultNcpToolRegistry([
          createClockTool(),
          createSleepTool(),
        ]);
        return new DefaultNcpAgentRuntime({
          contextBuilder: new DefaultNcpContextBuilder({
            toolRegistry,
            assetStore,
          }),
          llmApi,
          toolRegistry,
          stateManager,
        });
      },
    }),
  };
}

function resolveStoreDir(value: string | undefined): string {
  const normalized = value?.trim();
  if (normalized) {
    return resolve(normalized);
  }

  return resolve(process.cwd(), ".ncp-demo-store");
}
