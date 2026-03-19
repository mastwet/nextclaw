# 迭代完成说明

- 修复 Claude NCP runtime 的 readiness execution probe 误判问题。
- 移除了 `packages/extensions/nextclaw-ncp-runtime-claude-code-sdk/src/claude-code-execution-probe.ts` 中写死的 `maxBudgetUsd: 0.001`，避免真实可用的 Claude 路由被 `error_max_budget_usd` 误判为不可用。
- 验证了修复后 `/api/ncp/session-types` 中的 `claude` 会话类型会恢复为 `ready: true`，且真实 Claude 对话仍可返回 AI 回复。

# 测试/验证/验收方式

- 构建：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-claude-code-sdk build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk build`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-claude-code-sdk tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk tsc`
- 运行链路验证：
  - `curl -s http://127.0.0.1:18792/api/ncp/session-types | jq '.data.options[] | select(.value=="claude")'`
  - 期望 `ready: true`，且 `reason` / `reasonMessage` 为 `null`
- 真实回复冒烟：
  - `PATH=/opt/homebrew/bin:$PATH pnpm smoke:ncp-chat -- --session-type claude --model minimax/MiniMax-M2.5 --port 18792 --prompt 'Reply exactly CLAUDE_REAL_REPLY_OK_AFTER_PROBE_FIX' --json`
  - 期望 `ok: true`
  - 期望 `assistantText: "CLAUDE_REAL_REPLY_OK_AFTER_PROBE_FIX"`
- 可维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-ncp-runtime-claude-code-sdk/src/claude-code-execution-probe.ts`

# 发布/部署方式

- 本次为本地 dev 运行链路修复验证。
- 若要让已安装的本地 Claude 插件立即生效，需要在重新构建后同步已安装扩展产物，并重启 `pnpm dev:backend` 或 `pnpm dev start` 对应 backend 进程。
- 正式对外发布时，按项目既有 NPM 发布流程执行对应 extension 包发布，不在本次迭代内自动发布。

# 用户/产品视角的验收步骤

1. 启动本地服务：`pnpm dev start` 或至少启动 backend。
2. 打开 NextClaw 聊天页，确认 Claude 会话类型不再显示 `error_max_budget_usd` 的 setup 错误。
3. 新建或进入 Claude 会话。
4. 选择 Claude 推荐模型（当前验证使用 `minimax/MiniMax-M2.5`）。
5. 发送一条简单消息，例如“Reply exactly CLAUDE_REAL_REPLY_OK_AFTER_PROBE_FIX”。
6. 确认页面收到真实 AI 回复，而不是 readiness/setup 报错。
