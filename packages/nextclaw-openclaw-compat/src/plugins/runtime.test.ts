import { describe, expect, it, vi } from "vitest";
import { createPluginRuntime, setPluginRuntimeBridge } from "./runtime.js";

describe("createPluginRuntime", () => {
  it("exposes debounce helpers required by channel gateways", async () => {
    const runtime = createPluginRuntime({
      workspace: "/tmp/nextclaw-test",
      config: {
        messages: {
          inbound: {
            debounceMs: 5,
            byChannel: {
              feishu: 20,
            },
          },
        },
      } as never,
    });

    expect(
      runtime.channel.debounce.resolveInboundDebounceMs({
        cfg: runtime.config.loadConfig(),
        channel: "feishu",
      }),
    ).toBe(20);

    const flushed: string[][] = [];
    const debouncer = runtime.channel.debounce.createInboundDebouncer<string>({
      debounceMs: 0,
      buildKey: (value: string) => value,
      onFlush: async (items: string[]) => {
        flushed.push(items);
      },
    });

    await debouncer.enqueue("hello");
    expect(flushed).toEqual([["hello"]]);
  });

  it("bridges dispatchReplyFromConfig through the runtime bridge", async () => {
    const bridgeDispatch = vi.fn(async (params: {
      dispatcherOptions: {
        deliver: (payload: { text?: string }, info: { kind: string }) => void | Promise<void>;
      };
    }) => {
      await params.dispatcherOptions.deliver({ text: "pong" }, { kind: "final" });
    });
    setPluginRuntimeBridge({
      dispatchReplyWithBufferedBlockDispatcher: bridgeDispatch,
    });

    const runtime = createPluginRuntime({
      workspace: "/tmp/nextclaw-test",
    });
    const sendFinalReply = vi.fn(() => true);
    const dispatcher = {
      sendToolResult: vi.fn(() => true),
      sendBlockReply: vi.fn(() => true),
      sendFinalReply,
      waitForIdle: async () => {},
      getQueuedCounts: () => ({
        tool: 0,
        block: 0,
        final: sendFinalReply.mock.calls.length,
      }),
      markComplete: () => {},
    };

    const result = await runtime.channel.reply.dispatchReplyFromConfig({
      ctx: {
        Body: "ping",
      },
      dispatcher,
    });

    expect(bridgeDispatch).toHaveBeenCalledTimes(1);
    expect(sendFinalReply).toHaveBeenCalledWith({ text: "pong" });
    expect(result).toEqual({
      queuedFinal: true,
      counts: {
        tool: 0,
        block: 0,
        final: 1,
      },
    });

    setPluginRuntimeBridge(null);
  });
});
