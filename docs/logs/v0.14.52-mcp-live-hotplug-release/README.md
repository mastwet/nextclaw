# v0.14.52-mcp-live-hotplug-release

## 迭代完成说明

本次迭代承接 `v0.14.51-mcp-live-hotplug`，目标是把 MCP 热插拔改动完成正式版本发布闭环。

- 发布范围以本次 MCP 热插拔为核心，并包含 `changeset version` 自动联动出的内部依赖包：
  - 核心改动包：`@nextclaw/core`、`@nextclaw/mcp`、`nextclaw`
  - 联动版本包：`@nextclaw/ncp-mcp`、`@nextclaw/openclaw-compat`、`@nextclaw/runtime`、`@nextclaw/server`、`@nextclaw/channel-runtime`
  - 进一步联动的依赖消费方：`@nextclaw/desktop`、`@nextclaw/nextclaw-ncp-runtime-plugin-codex-sdk`、以及各 channel plugin 包
- 采用仓库既有 `changeset -> release:version -> release:publish` 流程完成版本提升、npm 发布与 git tag
- 提交范围仅包含本轮 MCP 相关源码、版本变更、changelog 与迭代留痕，不混入其它无关工作区改动

相关文档：

- [MCP 热插拔实现记录](../v0.14.51-mcp-live-hotplug/README.md)
- [NPM 发布流程](../../workflows/npm-release-process.md)
- [通用 MCP 集成方案](../../plans/2026-03-19-generic-mcp-registry-plan.md)

## 测试/验证/验收方式

发布前验证按受影响范围执行，至少覆盖：

- `pnpm -C packages/nextclaw-core exec vitest run src/config/reload.test.ts`
- `pnpm -C packages/nextclaw-mcp test`
- `pnpm -C packages/nextclaw exec vitest run src/cli/commands/ncp/create-ui-ncp-agent.test.ts src/cli/commands/ncp/nextclaw-ncp-tool-registry.mcp.test.ts`
- `pnpm -C packages/nextclaw-core build`
- `pnpm -C packages/nextclaw-mcp build`
- `pnpm -C packages/nextclaw build`
- `pnpm -C packages/nextclaw-core lint`
- `pnpm -C packages/nextclaw-mcp lint`
- `pnpm -C packages/nextclaw lint`
- `pnpm -C packages/nextclaw-core tsc`
- `pnpm -C packages/nextclaw-mcp tsc`
- `pnpm -C packages/nextclaw tsc`
- `post-edit-maintainability-guard`

发布前真实冒烟至少覆盖：

- 运行中的 `nextclaw serve` 场景下执行 `mcp add`
- 重复执行同一条 `mcp add`
- 执行 `mcp doctor <name>`
- 执行 `mcp remove <name>`
- 确认 add/remove 均为热插拔，无 restart 提示

## 发布/部署方式

按仓库既有 NPM 包流程执行：

1. 创建 changeset，限定受影响包
2. 执行 `pnpm release:version`
3. 提交版本变更
4. 执行 `pnpm release:publish`

本次不适用：

- 远程 migration：未涉及后端数据库变更
- 独立服务部署：本次为 npm/CLI 包发布

## 用户/产品视角的验收步骤

1. 安装最新发布版本的 `nextclaw`
2. 启动 `nextclaw serve`
3. 执行 `nextclaw mcp add chrome-devtools -- npx chrome-devtools-mcp@latest`
4. 确认 CLI 不再提示 restart，运行中服务可直接热加载
5. 执行 `nextclaw mcp doctor chrome-devtools`，确认可发现工具
6. 再次执行同一条 `nextclaw mcp add ...`，确认只得到友好提示，不出现 stack trace
7. 执行 `nextclaw mcp remove chrome-devtools`，确认无需重启即可移除；随后再次 `mcp add`，确认仍可热插拔恢复
