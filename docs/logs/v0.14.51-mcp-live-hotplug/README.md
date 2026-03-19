# v0.14.51-mcp-live-hotplug

## 迭代完成说明

本次把 MCP 从“写配置后提示重启生效”升级为真正的热插拔行为，重点包括：

- 将 `mcp.*` 配置变更从 `restart-required` 调整为独立的 `reload-mcp` 热加载分支。
- 为 `ConfigReloader` 新增 MCP reload 回调能力，并在 gateway/service 常驻进程中接入。
- 为 `@nextclaw/mcp` 的 lifecycle/registry 增加配置 reconcile 能力，支持：
  - 新增 server 后立即 warm
  - 删除 server 后立即 close
  - enable/disable 后即时生效
  - transport 变更后 close + re-warm
- 为 UI native NCP agent 增加 `applyMcpConfig`，让运行中的 native runtime 能在不重启进程的情况下接收新的 MCP tool catalog。
- 移除 `nextclaw mcp add/remove/enable/disable` 的重启提示。
- 改善重复添加 MCP server 的用户体验：已存在时输出友好提示并返回非零退出码，不再抛出整屏堆栈。

相关文档：

- [通用 MCP 集成方案](../../plans/2026-03-19-generic-mcp-registry-plan.md)
- [首版 MCP 落地记录](../v0.14.46-generic-mcp-delivery/README.md)

## 测试/验证/验收方式

已执行自动化验证：

- `pnpm -C packages/nextclaw-core exec vitest run src/config/reload.test.ts`
- `pnpm -C packages/nextclaw-mcp test`
- `pnpm -C packages/nextclaw exec vitest run src/cli/commands/ncp/create-ui-ncp-agent.test.ts src/cli/commands/ncp/nextclaw-ncp-tool-registry.mcp.test.ts`
- `pnpm -C packages/nextclaw-core build`
- `pnpm -C packages/nextclaw-mcp tsc`
- `pnpm -C packages/nextclaw-mcp build`
- `pnpm -C packages/nextclaw tsc`
- `pnpm -C packages/nextclaw build`
- `pnpm -C packages/nextclaw-core lint`
- `pnpm -C packages/nextclaw-mcp lint`
- `pnpm -C packages/nextclaw lint`
  - 结果：均无 error；仓库既有 maintainability warning 仍存在

已执行真实冒烟验证：

- 启动常驻服务：
  - `NEXTCLAW_HOME=<tmp> node packages/nextclaw/dist/cli/index.js serve --ui-port 18897`
- 热插拔新增：
  - `NEXTCLAW_HOME=<tmp> node packages/nextclaw/dist/cli/index.js mcp add demo -- <node> <mock-server> stdio`
  - 观察点：
    - CLI 输出仅为 `Added MCP server demo.`
    - 常驻服务输出 `Config reload: MCP servers reloaded.`
    - `mcp doctor demo --json` 立刻返回 `toolCount=1`
- 重复新增：
  - 再次执行相同 `mcp add`
  - 观察点：
    - 输出友好提示 `MCP server already exists: demo. Use 'mcp list' or remove it first.`
    - 退出码非零
    - 不再打印 JS stack trace
- 热插拔移除：
  - `NEXTCLAW_HOME=<tmp> node packages/nextclaw/dist/cli/index.js mcp remove demo`
  - 观察点：
    - CLI 输出 `Removed MCP server demo.`
    - 常驻服务再次输出 `Config reload: MCP servers reloaded.`
    - `mcp list --json` 立刻为空
- 再次新增：
  - 再次执行 `mcp add demo ...`
  - 观察点：
    - 无需重启服务即可重新发现工具
    - `mcp doctor demo --json` 再次返回 `toolCount=1`

## 发布/部署方式

本次为本地实现与验证完成，尚未执行正式发布。

如需发布，按现有 NPM/CLI 发布流程执行：

- 发布受影响包：
  - `@nextclaw/core`
  - `@nextclaw/mcp`
  - `nextclaw`
- 发布后使用已安装的 `nextclaw` 重跑 `mcp add/remove/doctor` 热插拔冒烟
- 若有常驻服务场景，再补一轮“服务运行中修改 MCP 配置”的在线验证

本次不适用：

- 远程 migration：未涉及后端数据库变更
- 线上 API 冒烟：未涉及服务端线上 API 变更

## 用户/产品视角的验收步骤

1. 启动一个常驻服务实例，例如：

```bash
tmp=$(mktemp -d /tmp/nextclaw-mcp-live.XXXXXX)
export NEXTCLAW_HOME="$tmp"

node packages/nextclaw/dist/cli/index.js serve --ui-port 18897
```

2. 在另一个终端添加真实 MCP server：

```bash
NEXTCLAW_HOME="$tmp" node packages/nextclaw/dist/cli/index.js \
  mcp add chrome-devtools -- npx chrome-devtools-mcp@latest
```

3. 确认不会再出现“Restart the gateway to apply”之类提示；如果常驻服务在运行，应直接热加载。

4. 执行：

```bash
NEXTCLAW_HOME="$tmp" node packages/nextclaw/dist/cli/index.js mcp list
NEXTCLAW_HOME="$tmp" node packages/nextclaw/dist/cli/index.js mcp doctor chrome-devtools
```

5. 再次执行同一条 `mcp add`，确认得到友好提示而不是堆栈报错。

6. 执行：

```bash
NEXTCLAW_HOME="$tmp" node packages/nextclaw/dist/cli/index.js mcp remove chrome-devtools
```

7. 确认运行中的服务无需重启即可完成移除；随后再次 `mcp add`，确认无需重启即可重新可用。
