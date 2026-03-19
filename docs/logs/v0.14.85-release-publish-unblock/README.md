# 迭代完成说明

- 修复 Claude NCP runtime readiness probe 的误判问题，去掉了 `packages/extensions/nextclaw-ncp-runtime-claude-code-sdk/src/claude-code-execution-probe.ts` 中会触发 `error_max_budget_usd` 的预算探测参数。
- 保持 Claude 会话真实对话链路可用，并完成本地真实回复验证。
- 为解除 `release:publish` 阻塞，整理了 `workers/nextclaw-provider-gateway-api` 中触发 lint/tsc 风险的控制器与服务实现。
- 完成相关发布组的版本提升与 NPM 发布，补齐变更日志与包版本。
- 相关方案背景可参考：[Claude Runtime Model Contract Design](../../plans/2026-03-19-claude-runtime-model-contract-design.md)。

# 测试/验证/验收方式

- Claude readiness 验证：
  - `curl -s http://127.0.0.1:18792/api/ncp/session-types | jq '.data.options[] | select(.value=="claude")'`
  - 期望 `ready: true`，且不再出现 `error_max_budget_usd`
- Claude 真实回复冒烟：
  - `PATH=/opt/homebrew/bin:$PATH pnpm smoke:ncp-chat -- --session-type claude --model minimax/MiniMax-M2.5 --port 18792 --prompt 'Reply exactly CLAUDE_REAL_REPLY_OK_AFTER_PROBE_FIX' --json`
  - 期望 `ok: true`
  - 期望 `assistantText: "CLAUDE_REAL_REPLY_OK_AFTER_PROBE_FIX"`
- release 阻塞解除验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api tsc`
- 发布链路验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:version`
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:publish`
- 可维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-ncp-runtime-claude-code-sdk/src/claude-code-execution-probe.ts packages/nextclaw/src/cli/commands/dev-first-party-plugin-load-paths.ts packages/nextclaw/src/cli/commands/dev-first-party-plugin-load-paths.test.ts packages/nextclaw/src/cli/commands/plugins.ts workers/nextclaw-provider-gateway-api/src/controllers/admin-controller.ts workers/nextclaw-provider-gateway-api/src/controllers/auth-controller.ts workers/nextclaw-provider-gateway-api/src/controllers/openai-controller.ts workers/nextclaw-provider-gateway-api/src/services/platform-service.ts`

# 发布/部署方式

- 本次已执行项目既有 NPM 发布流程，并成功发布以下包：
  - `@nextclaw/nextclaw-ncp-runtime-claude-code-sdk@0.1.2`
  - `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk@0.1.6`
  - `@nextclaw/ncp-mcp@0.1.8`
  - `@nextclaw/mcp@0.1.8`
  - `@nextclaw/remote@0.1.4`
  - `@nextclaw/server@0.10.8`
  - `nextclaw@0.13.8`
- 本地使用方更新后，重新安装依赖并重启 `pnpm dev start` 即可拿到修复后的 Claude 插件与 CLI 版本。

# 用户/产品视角的验收步骤

1. 执行 `pnpm dev start` 启动本地环境。
2. 在插件页确认 Claude 插件已安装，进入 Claude 会话。
3. 选择模型 `minimax/MiniMax-M2.5`。
4. 发送消息：`Reply exactly CLAUDE_REAL_REPLY_OK_AFTER_PROBE_FIX`。
5. 确认页面返回真实 AI 回复 `CLAUDE_REAL_REPLY_OK_AFTER_PROBE_FIX`，且不再弹出 `error_max_budget_usd`。
6. 如需验证发布结果，可安装最新发布版本并重复以上步骤。
