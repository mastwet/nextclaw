# v0.14.178 codex model metadata warning cleanup

## 迭代完成说明

- 修复 `codex` 会话选择 `dashscope/qwen3-coder-next` 这类 OpenAI-compatible 模型时，Codex SDK 产出的 non-fatal `error item` 被错误映射成用户可见 `tool/error` 消息的问题。
- 根因不是 `/responses` bridge 失效，而是 `@openai/codex-sdk` / `@openai/codex` 对未知模型会吐 metadata warning；我们此前把这类 non-fatal item 当成真实工具调用写进了会话。
- 现在 `packages/extensions/nextclaw-ncp-runtime-codex-sdk/src/codex-sdk-ncp-event-mapper.ts` 不再把 `item.type === "error"` 映射为用户可见 tool-call 事件；fatal 错误仍然只走 `turn.failed` / stream `error`。
- 新增回归测试 `packages/nextclaw/src/cli/commands/ncp/codex-sdk-event-mapper.test.ts`，锁定“non-fatal error item 不再外泄，但真实工具调用仍保留”。

## 测试/验证/验收方式

- 单测：
  - `PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm --filter nextclaw test -- --run src/cli/commands/ncp/codex-sdk-event-mapper.test.ts src/cli/commands/ncp/codex-openai-responses-bridge.test.ts src/cli/commands/ncp/create-ui-ncp-agent.test.ts`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pnpm --filter @nextclaw/nextclaw-ncp-runtime-codex-sdk tsc`
- 真实 dev 场景冒烟：
  - 使用隔离 `NEXTCLAW_HOME`，只加载本地源码 `packages/extensions/nextclaw-ncp-runtime-plugin-codex-sdk`
  - 启动：`NEXTCLAW_HOME=<tmp-home> pnpm -C packages/nextclaw dev serve --ui-port 18941`
  - 冒烟：`PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME=<tmp-home> /opt/homebrew/bin/pnpm smoke:ncp-chat -- --session-type codex --model dashscope/qwen3-coder-next --base-url http://127.0.0.1:18941 --prompt 'Reply with exactly NEXTCLAW_DEV_CODEX_CLEAN_OK_2' --timeout-ms 180000 --json`
- 真实结果：
  - `ok: true`
  - `assistantText: NEXTCLAW_DEV_CODEX_CLEAN_OK_2`
  - `terminalEvent: run.finished`
  - 会话文件中不再出现 `Model metadata for ... not found` / `toolName: "error"` / `tool_calls`

## 发布/部署方式

- 本次是本地热修验证，尚未执行新的 commit / npm release / GitHub Release。
- 若需要正式发布，按仓库标准流程执行：
  - `pnpm release:version`
  - `pnpm release:publish`
- 发布后需要再次用已发布包做隔离安装验证，确认 `codex` 会话选择 `dashscope/qwen3-coder-next` 时不再把 metadata warning 暴露给用户。

## 用户/产品视角的验收步骤

1. 启动本地 NextClaw dev 服务。
2. 新建一个 `codex` 会话。
3. 模型选择 `dashscope/qwen3-coder-next`。
4. 发送一句明确可校验的话，例如 `Reply with exactly NEXTCLAW_DEV_CODEX_CLEAN_OK_2`。
5. 期望结果：
   - AI 正常回复，不再弹出或插入 `Model metadata for qwen3-coder-next not found...`
   - 会话里只有正常 assistant 文本，不再出现 `error` 工具消息。
