# v0.14.146-remote-reconnect-backoff-halt

## 迭代完成说明

本次迭代收敛了 remote connector 在 WebSocket 失败场景下的重连策略，目标是避免固定 3 秒无上限重连持续打平台、浪费 Cloudflare Worker / DO 请求额度，并保持 transport 层对上层的透明边界。

- `@nextclaw/remote`：
  - 将 WebSocket 握手拒绝类错误纳入 terminal error 判定，认证/配置类失败不再无脑重试。
  - 将普通 `websocket failed` 从固定 3 秒重连改为指数退避重连。
  - 新增连续失败熔断：连续 6 次失败后自动停止重连，并把停止原因写入 runtime status，避免后台无限刷日志和持续打平台。
  - 修复 device 注册态在连接失败后丢失的问题，避免每次重连都重复触发 `registerDevice` 请求。
  - 将新增的重试策略和 websocket 错误解析拆出独立 utils 文件，避免 `remote-connector.ts` 穿过可维护性预算线。
- `nextclaw`：
  - 补充 `remote-connector-runtime.test.ts`，覆盖 token 失效立即停止、握手 403 立即停止、连续 websocket 失败指数退避并熔断三条关键路径。
- 发布闸门清理：
  - 删除 `packages/nextclaw-server/src/ui/router/config.controller.ts` 中未使用的 `ChannelAuthPollRequest` 类型导入，解除仓库全量 lint 对本次 release 的阻塞。
  - 删除 `packages/nextclaw/src/cli/commands/plugins.ts` 中未使用的 `mergePluginConfigView`、`toPluginConfigView`、`PluginChannelBinding` 导入，解除 CLI 包 lint 对本次 release 的阻塞。

相关设计背景：

- [NextClaw Remote App Transport Multiplex Design](../../../plans/2026-03-23-nextclaw-remote-app-transport-multiplex-design.md)
- [v0.14.142 App Transport Transparent Replacement](../v0.14.142-app-transport-transparent-replacement/README.md)

## 测试/验证/验收方式

本次执行的验证：

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw test -- --run src/cli/commands/remote-connector-runtime.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-remote tsc --pretty false`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-remote build`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc --pretty false`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build`
- `PATH=/opt/homebrew/bin:$PATH pnpm exec eslint packages/nextclaw-remote/src/remote-connector.ts packages/nextclaw-remote/src/remote-connector-error.ts packages/nextclaw-remote/src/remote-connector-retry.utils.ts packages/nextclaw-remote/src/remote-connector-websocket-error.utils.ts packages/nextclaw/src/cli/commands/remote-connector-runtime.test.ts`
- `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-remote/src/remote-connector.ts packages/nextclaw-remote/src/remote-connector-error.ts packages/nextclaw-remote/src/remote-connector-retry.utils.ts packages/nextclaw-remote/src/remote-connector-websocket-error.utils.ts packages/nextclaw/src/cli/commands/remote-connector-runtime.test.ts`
- `PATH=/opt/homebrew/bin:$PATH node --input-type=module ...` 冒烟运行构建后的 `@nextclaw/remote`，模拟连续 websocket 失败，确认：
  - `registerCalls === 1`
  - 退避序列为 `3000 / 6000 / 12000 / 24000 / 48000`
  - 第 6 次失败后停止自动重连
  - runtime status 最终为 `state: "error"` 且携带熔断原因
- `PATH=/opt/homebrew/bin:$PATH npx -y nextclaw@0.13.37 --version`

关键观察点：

- token 失效和握手 `403` 会立即停止重连，不再每 3 秒打一次平台。
- 连续 websocket 失败不再无限刷屏，而是指数退避并在阈值后停下。
- 同一 device 不会在每次 websocket 失败后重复重新注册。

## 发布/部署方式

本次需要发包的组件：

- `@nextclaw/remote`
- `@nextclaw/mcp`
- `@nextclaw/server`
- `nextclaw`

按项目 NPM 发布流程执行：

1. 创建只包含本次修复的 changeset。
2. 运行 `pnpm release:version` 生成版本与 changelog。
3. 运行 `pnpm release:publish` 发布受影响包。

本次实际发布结果：

- `nextclaw@0.13.37`：已发布
- `@nextclaw/remote@0.1.27`：已发布
- `@nextclaw/server@0.10.33`：已发布
- `@nextclaw/mcp`：release group 校验已覆盖，但本地版本 `0.1.29` 已在 npm 存在，因此本轮未重复发布
- 本地 tag 已生成：
  - `nextclaw@0.13.37`
  - `@nextclaw/remote@0.1.27`
  - `@nextclaw/server@0.10.33`

本次改动不涉及 platform worker / database / migration，因此：

- `deploy:platform:backend`：不适用
- 远程 migration：不适用

## 用户/产品视角的验收步骤

1. 安装本次发布后的 `nextclaw` 新版本并启动本地服务。
2. 在无法连通 remote platform 的环境下运行或保持 remote service。
3. 观察终端日志，确认不会再出现固定 3 秒无限重连；应看到退避间隔逐步增大，并在连续失败后停止自动重连。
4. 打开远程访问页面或执行 `nextclaw remote status`，确认状态进入错误态，而不是后台持续隐式重试。
5. 修复网络、平台地址或重新登录后，使用“重新连接/修复”动作恢复远程访问。
