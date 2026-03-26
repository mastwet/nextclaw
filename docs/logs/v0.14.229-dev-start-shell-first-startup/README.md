# v0.14.229-dev-start-shell-first-startup

## 迭代完成说明

- 重构 `nextclaw service` / `pnpm dev start` 的启动链路，让 UI/API shell 先启动并对外可用，再把 NCP agent、plugin gateway、channel `startAll()` 放到后台延迟启动。
- 新增 `packages/nextclaw/src/cli/commands/service-deferred-ncp-agent.ts`，提供 deferred NCP agent 占位层，保证 UI server 启动时已有稳定的 agent 接口，后台真实 agent ready 后再热接管。
- 新增 `packages/nextclaw/src/cli/commands/service-gateway-startup.ts`，把 UI shell 启动、后台 deferred startup、runtime loop 编排拆出主文件，降低启动顺序耦合。
- 新增 `packages/nextclaw/src/cli/commands/service-gateway-context.ts`，集中装配 gateway 运行时依赖，避免 `service.ts` 同时承担配置解析、依赖构建、UI 启动和后台启动编排。
- 重排 `packages/nextclaw/src/cli/commands/service.ts` 的主流程：先创建 gateway context，再启动 UI shell，再并发跑 runtime loop 与后台 startup，避免插件 / channel 初始化阻塞前端可用性。
- 新增 `packages/nextclaw/src/cli/commands/service-deferred-ncp-agent.test.ts`，覆盖 deferred agent 在 ready 前后切换与关闭行为，防止占位代理失效。

## 测试/验证/验收方式

- 运行 `pnpm -C packages/nextclaw tsc`，确认本次拆分后的服务启动模块通过类型检查。
- 运行 `pnpm -C packages/nextclaw test -- --run src/cli/commands/service-deferred-ncp-agent.test.ts`，确认 deferred NCP agent 单测通过。
- 冒烟测试：
  - 运行 `NEXTCLAW_HOME=/tmp/nextclaw-startup-smoke-home-3 NEXTCLAW_DEV_BACKEND_PORT=18894 NEXTCLAW_DEV_FRONTEND_PORT=5276 pnpm dev start`
  - 观察日志先输出 `✓ UI API`，之后才出现 `✓ UI NCP agent: ready` 与 deferred startup 完成日志，证明 UI/API shell 不再等待全部插件 / 渠道启动完成。
  - 轮询 `curl http://127.0.0.1:18894/api/auth/status`，第 3 次轮询返回 `200`。
  - 轮询 `curl http://127.0.0.1:18894/api/health`，第 3 次轮询返回 `200`。
- 运行 `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw/src/cli/commands/service.ts packages/nextclaw/src/cli/commands/service-gateway-context.ts packages/nextclaw/src/cli/commands/service-gateway-startup.ts packages/nextclaw/src/cli/commands/service-deferred-ncp-agent.ts packages/nextclaw/src/cli/commands/service-deferred-ncp-agent.test.ts`，确认无新的可维护性阻塞项。

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

- 本次是否减债：是
- 说明：本次把 UI 启动、gateway context 装配、deferred startup 编排从 `service.ts` 抽离到独立模块，主文件从原先更重的单体启动实现收敛为“组装 + 调度”职责，降低了启动链路耦合和未来继续膨胀的速度。
- 下一步拆分缝：继续把 `ServiceCommands` 中与 marketplace、remote access、restart / stop / status 相关的子域职责独立出去，逐步把 `service.ts` 收敛成命令入口与轻量 orchestration 层。
