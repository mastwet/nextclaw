# v0.14.64-claude-dev-start-executable-fix

## 迭代完成说明

- 修复 Claude NCP runtime 在本地 `pnpm dev start` / `serve` 场景下的可执行解析问题。
- 根因不是 `@anthropic-ai/claude-agent-sdk` 的 `cli.js` 真不存在，而是 SDK 在未显式指定时会默认用字符串 `"node"` 去启动 `cli.js`；当服务子进程环境里的 `PATH` 不包含 `node` 时，底层 `spawn` 返回 `ENOENT`，但错误文案会误导成 “Claude Code executable not found at .../cli.js”。
- 现在 runtime 会在未显式配置 `executable` 时，优先使用当前进程的绝对 `process.execPath`，并显式解析 `@anthropic-ai/claude-agent-sdk` 包内的 `cli.js` 路径，避免开发态/服务态因 PATH 差异再次报错。
- 新增回归测试，验证即使插件环境里的 `PATH` 为空，Claude 会话仍能成功完成消息发送。

## 测试/验证/验收方式

- 运行时包验证：
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-claude-code-sdk build`
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-claude-code-sdk lint`
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-claude-code-sdk tsc`
- Claude 回归测试：
  - `pnpm --filter nextclaw exec vitest run src/cli/commands/ncp/create-ui-ncp-agent.test.ts`
  - 重点观察新增用例：
    - `runs claude session messages even when PATH does not include a node executable`
- 开发态真实烟测：
  - 以临时 `NEXTCLAW_HOME` 启动 `pnpm dev start`
  - 配置 `nextclaw-ncp-runtime-plugin-claude-code-sdk`
  - 插件 `env.PATH` 置空
  - 通过真实 `/api/ncp/session-types` 与 `/api/ncp/agent/send` 路由验证 `claude` 会话类型可见，且 Claude 消息可成功返回并结束于 `run.finished`
- 定向 lint：
  - `pnpm --filter nextclaw exec eslint src/cli/commands/ncp/create-ui-ncp-agent.test.ts`
- 可维护性闸门：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/extensions/nextclaw-ncp-runtime-claude-code-sdk/src/index.ts packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.test.ts`

## 发布/部署方式

- 本次修复涉及 Claude NCP runtime 源码，无数据库或远程 migration。
- 合并后按常规前端/服务发布链路重新发布包含该 runtime 的上层包即可。
- 本地开发态无需额外手工配置 `executable=node`；修复后默认会使用当前运行服务进程的绝对 Node 路径。

## 用户/产品视角的验收步骤

1. 本地执行 `pnpm dev start`。
2. 启用 Claude runtime 插件，并保持 Claude 配置可用。
3. 打开聊天页，确认会话类型中能看到 `Claude`。
4. 新建或切换到 `Claude` 会话，发送一条消息。
5. 确认不再出现 `Claude Code executable not found at .../cli.js` 报错。
6. 确认 Claude 回复正常返回，并且后续同会话继续发送消息也可持续工作。
