# v0.14.134-claude-marketplace-executable-fix

## 迭代完成说明

- 修复了 Claude marketplace 插件安装后被误判为缺少 executable 的根因。
- 根因不是 `@anthropic-ai/claude-agent-sdk` 真缺少 `cli.js`，而是 `packages/extensions/nextclaw-ncp-runtime-claude-code-sdk/src/claude-code-process-resolution.ts` 之前通过 `@anthropic-ai/claude-agent-sdk/package.json` 解析 SDK 根目录；在 npm 安装布局下，该子路径会因为 package `exports` 限制触发 `ERR_PACKAGE_PATH_NOT_EXPORTED`，导致 bundled CLI 路径解析失败。
- 现在改为优先尝试 `@anthropic-ai/claude-agent-sdk/package.json`，若不可导出则回退到 `@anthropic-ai/claude-agent-sdk` 主入口，再从其目录推导 `cli.js`，兼容 marketplace / npm 安装场景。
- 新增回归测试 `packages/nextclaw/src/cli/commands/ncp/claude-code-process-resolution.test.ts`，模拟“包只导出 `.`、不导出 `./package.json`”的真实 npm 行为，确保不会再次把 Claude runtime 误报成 `claude_executable_missing`。

## 测试/验证/验收方式

- 运行回归测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw exec vitest run src/cli/commands/ncp/claude-code-process-resolution.test.ts src/cli/commands/ncp/create-ui-ncp-agent.claude.test.ts`
- 运行受影响运行时包验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-claude-code-sdk build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-claude-code-sdk lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-ncp-runtime-claude-code-sdk tsc`
- 运行测试文件 lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw exec eslint src/cli/commands/ncp/claude-code-process-resolution.test.ts src/cli/commands/ncp/create-ui-ncp-agent.claude.test.ts`
- 运行可维护性检查：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-ncp-runtime-claude-code-sdk/src/claude-code-process-resolution.ts packages/nextclaw/src/cli/commands/ncp/claude-code-process-resolution.test.ts`

## 发布/部署方式

- 本次改动触达 Claude runtime 源码，需要按常规 NPM 发布链路发布受影响包。
- 至少需要发布：
  - `@nextclaw/nextclaw-ncp-runtime-claude-code-sdk`
  - 以及依赖它的 `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk`
- 无数据库 migration、无后端远程 migration 要求。

## 用户/产品视角的验收步骤

1. 在 NextClaw 的 marketplace 中安装 `Claude NCP Runtime Plugin`。
2. 安装完成后启用该插件，并保持 Claude 相关认证或 Claude 兼容 provider 配置可用。
3. 打开聊天页或会话类型列表，确认 `Claude` 不再因为 `claude_executable_missing` / executable 缺失而显示不可用。
4. 新建一个 `Claude` 会话并发送一条最小消息。
5. 确认消息能够正常启动并返回 Claude 回复，而不是在 ready/probe 阶段报缺少 executable。
