import {
  DefaultNcpAgentRuntime,
  DefaultNcpContextBuilder,
  DefaultNcpToolRegistry,
  LocalAttachmentStore,
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
  attachmentStore: LocalAttachmentStore;
} {
  const llmApi = createLlmApi();
  const storeDir = resolveStoreDir(process.env.NCP_DEMO_STORE_DIR);
  const attachmentStore = new LocalAttachmentStore({
    rootDir: join(storeDir, "attachments"),
  });
  return {
    attachmentStore,
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
            attachmentStore,
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
