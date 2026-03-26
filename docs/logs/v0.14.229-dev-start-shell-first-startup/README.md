# v0.14.229-dev-start-shell-first-startup

## 迭代完成说明

- 重构 `nextclaw service` / `pnpm dev start` 的启动链路，让 UI/API shell 真正先启动并对外可用，再把 gateway 运行时、plugin gateway、channel `startAll()`、NCP agent 放到后续阶段。
- 新增 `packages/nextclaw/src/cli/commands/service-deferred-ncp-agent.ts`，提供 deferred NCP agent 占位层，保证 UI server 启动时已有稳定的 agent 接口，后台真实 agent ready 后再热接管。
- 新增 `packages/nextclaw/src/cli/commands/service-gateway-startup.ts`，把 UI shell 启动、后台 deferred startup、runtime loop 编排拆出主文件，降低启动顺序耦合。
- 新增 `packages/nextclaw/src/cli/commands/service-gateway-context.ts` 里的 `createGatewayShellContext()`，把 `loadConfig + uiConfig + cron + remoteModule` 这类壳层最小依赖与重型 gateway 装配分离。
- 重排 `packages/nextclaw/src/cli/commands/service.ts` 的主流程：先创建 shell context 并启动 UI shell，随后 `await setImmediate()` 主动让出事件循环，再进入 `createGatewayStartupContext()` 的重型同步装配，避免首个 `/api/auth/status`、`/api/health` 请求被插件 / runtime graph 卡死。
- 启动后端时，插件配置相关的 `getPluginChannelBindings` / `getPluginUiMetadata` 改为由 UI shell 读取可变闭包；真正的 plugin registry 装配完成后，再通过 `config.updated` 事件把前端刷新到真实状态。
- 新增 `packages/nextclaw/src/cli/commands/service-deferred-ncp-agent.test.ts`，覆盖 deferred agent 在 ready 前后切换与关闭行为，防止占位代理失效。

## 测试/验证/验收方式

- 运行 `pnpm -C packages/nextclaw tsc`，确认本次拆分后的服务启动模块通过类型检查。
- 运行 `pnpm -C packages/nextclaw-ui test -- --run src/App.test.tsx src/hooks/use-auth.test.ts`，确认前端等待态与 auth bootstrap 重试逻辑继续通过。
- 运行 `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw/src/cli/commands/service.ts packages/nextclaw/src/cli/commands/service-gateway-context.ts packages/nextclaw/src/cli/commands/service-gateway-startup.ts packages/nextclaw-ui/src/App.tsx packages/nextclaw-ui/src/App.test.tsx`。
  - 结果：本次未新增新的小文件膨胀，但 `packages/nextclaw/src/cli/commands/service.ts` 仍处于历史红区；guard 将其判为阻塞，后续需继续把 `startGateway/startService` 从超长 orchestration 中拆出。
- 冒烟测试建议：
  - 运行 `NEXTCLAW_HOME=/tmp/nextclaw-startup-smoke-home-4 NEXTCLAW_DEV_BACKEND_PORT=18894 NEXTCLAW_DEV_FRONTEND_PORT=5276 pnpm dev start`
  - 观察日志应先出现 `✓ UI API` / `✓ UI frontend`，随后才继续进入 `✓ UI NCP agent: ready` 与 deferred startup 完成日志。
  - 在浏览器打开前端后，`/api/auth/status` 与 `/api/health` 应该明显早于插件与渠道完全 ready 就返回。

## 发布/部署方式

- 本次改动属于本地开发与服务启动链路重构，无需单独执行额外部署步骤。
- 合入后，开发环境直接使用现有命令 `pnpm dev start` 即可获得 shell-first 启动行为。
- 若后续发布 `nextclaw` 包，需要沿用既有发版流程，并在发布前重复执行上面的 `tsc`、单测与 `pnpm dev start` 冒烟。

## 用户/产品视角的验收步骤

- 在本仓库执行 `pnpm dev start`。
- 打开前端页面后，页面壳与接口应先可访问，不再因为插件 / channel 初始化未完成而长时间卡在等待后端返回。
- 即使某些 plugin gateway、channel 或 NCP agent 仍在后台启动，`/api/auth/status`、`/api/health` 应尽快可用。
- 后台启动完成后，聊天、插件和渠道能力继续热接入，不需要重新刷新整个服务。

## 红区触达与减债记录

### packages/nextclaw/src/cli/commands/service.ts

- 本次是否减债：部分减债
- 说明：本次把 shell context 与启动时序拆开，解决了“先装插件/runtime 再开壳”的关键路径问题，但 `service.ts` 仍然维持超长文件与超长 orchestration 函数状态；这次优先修了启动因果顺序，没有顺手把整块 service orchestration 全部拆净。
- 下一步拆分缝：继续把 `startGateway()` 里的 shell 启动、gateway 重装配、reload wiring、cleanup wiring 独立成 helper/module；再把 `startService()` 的进程管理与日志/端口编排抽离，消除 guard 里剩余的超长函数告警。
