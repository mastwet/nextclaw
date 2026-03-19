import { describe, expect, it } from "vitest";
import { buildReloadPlan } from "./reload.js";

describe("buildReloadPlan", () => {
  it("does not force channel restart for non-channel plugin changes", () => {
    const plan = buildReloadPlan(["plugins.entries.nextclaw-ncp-runtime-plugin-codex-sdk.enabled"]);
    expect(plan.reloadPlugins).toBe(true);
    expect(plan.restartChannels).toBe(false);
  });

  it("reloads MCP changes without marking restart required", () => {
    const plan = buildReloadPlan(["mcp.servers.chrome-devtools.enabled"]);
    expect(plan.reloadMcp).toBe(true);
    expect(plan.restartRequired).toEqual([]);
  });
});
