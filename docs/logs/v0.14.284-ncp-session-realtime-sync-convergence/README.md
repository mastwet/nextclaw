# v0.14.284-ncp-session-realtime-sync-convergence

## 迭代完成说明

- 按 [NCP Session Realtime Sync Refactor Plan](../../plans/2026-03-29-ncp-session-realtime-sync-refactor-plan.md) 落地第一阶段收敛：
  - 当前会话消息流继续走现有 NCP stream，只服务当前打开的会话面板。
  - session 列表同步升级为 WebSocket typed changefeed，事件从粗粒度 `session.updated` 推进为 `session.summary.upsert` / `session.summary.delete`。
- 前端把 `React Query` 收口为远端 session summary 的唯一缓存源：
  - 删除 `useNcpSessions()` 的 `refetchInterval`。
  - 删除 `NcpChatPage` 中 streaming 期间对 session 列表的手动 `refetch`。
  - realtime 事件直接通过 query cache patch 增量合并，不再失效整份 session 列表。
- 前端把 `Zustand` 收口为本地 UI 状态：
  - `chatSessionListStore` 只保留 `selectedSessionKey`、`selectedAgentId`、`query`。
  - 删除 `chatRunStatusStore`，sidebar 直接读取 query 视图，不再镜像远端 session 列表与 run 状态。
- 后端把 session summary 生产责任集中到专用模块：
  - 新增 session summary helper、realtime change publisher、deferred session service。
  - `/api/ncp/sessions` 在 agent ready 前读 persisted store，ready 后切到 live session API。
  - session patch/delete 不再混用 `config.updated { path: 'session' }`。
- 为避免 `service.ts` 继续恶化，新增 `service-ncp-session-realtime-bridge.ts`，把 deferred session service + changefeed publisher 的 wiring 从主装配文件里抽离出去。

## 测试/验证/验收方式

- 类型检查：

```bash
pnpm --filter @nextclaw/ui exec tsc --noEmit
pnpm --filter @nextclaw/server exec tsc --noEmit
pnpm --filter nextclaw exec tsc --noEmit
```

- 受影响测试：

```bash
pnpm --filter @nextclaw/ui exec vitest run src/api/ncp-session-query-cache.test.ts src/components/chat/ChatSidebar.test.tsx src/components/chat/managers/chat-session-list.manager.test.ts src/components/chat/chat-session-preference-sync.test.ts src/components/chat/ncp/ncp-session-adapter.test.ts
pnpm --filter nextclaw exec vitest run src/cli/commands/service-deferred-ncp-agent.test.ts src/cli/commands/service-deferred-ncp-session-service.test.ts src/cli/commands/ncp/ui-session-service.test.ts src/cli/commands/ncp/nextclaw-agent-session-store.test.ts src/cli/commands/ncp/ncp-session-realtime-change.test.ts src/cli/commands/service-gateway-startup.test.ts
```

- 受影响 lint / build：

```bash
pnpm --filter @nextclaw/ui exec eslint src/api/ncp-session-query-cache.ts src/api/ncp-session-query-cache.test.ts src/components/chat/ChatSidebar.tsx src/components/chat/ChatSidebar.test.tsx src/components/chat/chat-session-label.service.ts src/components/chat/managers/chat-session-list.manager.ts src/components/chat/ncp/NcpChatPage.tsx src/components/chat/ncp/ncp-chat-thread.manager.ts src/components/chat/ncp/ncp-chat.presenter.ts src/components/chat/ncp/ncp-session-adapter.ts src/components/chat/ncp/ncp-session-adapter.test.ts src/components/chat/ncp/use-ncp-session-list-view.ts src/components/chat/presenter/chat-presenter-context.tsx src/components/chat/stores/chat-session-list.store.ts src/hooks/use-realtime-query-bridge.ts src/hooks/useConfig.ts
pnpm --filter nextclaw exec eslint src/cli/commands/service.ts src/cli/commands/service-ncp-session-realtime-bridge.ts src/cli/commands/ncp/create-ui-ncp-agent.ts src/cli/commands/ncp/ui-session-service.ts src/cli/commands/ncp/ncp-session-summary.ts src/cli/commands/ncp/ncp-session-realtime-change.ts src/cli/commands/ncp/ncp-session-realtime-change.test.ts src/cli/commands/service-deferred-ncp-agent.test.ts src/cli/commands/service-deferred-ncp-session-service.ts src/cli/commands/service-deferred-ncp-session-service.test.ts src/cli/commands/service-gateway-startup.ts
pnpm --filter @nextclaw/server exec eslint src/ui/router/ncp-session.controller.ts src/ui/types.ts
pnpm -C packages/nextclaw-ui build
pnpm -C packages/nextclaw-server build
pnpm -C packages/nextclaw build
```

- 可维护性守卫：

```bash
node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-server/src/ui/router/ncp-session.controller.ts packages/nextclaw-server/src/ui/types.ts packages/nextclaw-ui/src/api/ncp-session-query-cache.ts packages/nextclaw-ui/src/api/ncp-session-query-cache.test.ts packages/nextclaw-ui/src/components/chat/ChatSidebar.tsx packages/nextclaw-ui/src/components/chat/ChatSidebar.test.tsx packages/nextclaw-ui/src/components/chat/chat-session-label.service.ts packages/nextclaw-ui/src/components/chat/managers/chat-session-list.manager.ts packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx packages/nextclaw-ui/src/components/chat/ncp/ncp-chat-thread.manager.ts packages/nextclaw-ui/src/components/chat/ncp/ncp-chat.presenter.ts packages/nextclaw-ui/src/components/chat/ncp/ncp-session-adapter.ts packages/nextclaw-ui/src/components/chat/ncp/ncp-session-adapter.test.ts packages/nextclaw-ui/src/components/chat/ncp/use-ncp-session-list-view.ts packages/nextclaw-ui/src/components/chat/presenter/chat-presenter-context.tsx packages/nextclaw-ui/src/components/chat/stores/chat-session-list.store.ts packages/nextclaw-ui/src/hooks/use-realtime-query-bridge.ts packages/nextclaw-ui/src/hooks/useConfig.ts packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts packages/nextclaw/src/cli/commands/ncp/ui-session-service.ts packages/nextclaw/src/cli/commands/ncp/ncp-session-summary.ts packages/nextclaw/src/cli/commands/ncp/ncp-session-realtime-change.ts packages/nextclaw/src/cli/commands/ncp/ncp-session-realtime-change.test.ts packages/nextclaw/src/cli/commands/service-deferred-ncp-agent.test.ts packages/nextclaw/src/cli/commands/service-deferred-ncp-session-service.ts packages/nextclaw/src/cli/commands/service-deferred-ncp-session-service.test.ts packages/nextclaw/src/cli/commands/service-gateway-startup.ts packages/nextclaw/src/cli/commands/service-ncp-session-realtime-bridge.ts packages/nextclaw/src/cli/commands/service.ts
```

## 发布/部署方式

- 本次未执行远端发布或部署；变更已在本地完成受影响 `lint`、`tsc`、`test`、`build` 与 maintainability guard。
- 若后续要发布前端闭环，继续按仓库既有流程执行 `pnpm /release-frontend` 或对应 release 流程，不需要额外的 session 同步兼容步骤。

## 用户/产品视角的验收步骤

1. 打开 NCP 聊天页，进入一个消息很多的长会话。
2. 发送一条会触发较长 streaming 的消息，确认当前会话仍持续流式输出。
3. 在 streaming 期间切换到其它会话，确认 sidebar 与会话切换不再因为整份 session 列表轮询/重拉而明显卡顿。
4. 在侧栏对会话做重命名或删除，确认列表能立即增量更新，不需要全量刷新。
5. 断开并恢复 WebSocket 连接后，确认 session 列表会做一次显式 resync，而不是在 streaming 期间持续后台轮询。

## 红区触达与减债记录

### packages/nextclaw/src/cli/commands/service.ts

- 本次是否减债：是，局部减债。
- 说明：本次确实触达了 `service.ts`，但没有把 session realtime 兼容/轮询/兜底逻辑继续堆进主装配文件，而是新增 `service-ncp-session-realtime-bridge.ts`、`service-deferred-ncp-session-service.ts`、`ncp-session-realtime-change.ts` 等专用模块承接职责，并把 `service.ts` 行数从改动峰值收回到不高于改动前基线。
- 下一步拆分缝：继续把 `startService` 的后台进程拉起、readiness probe、状态文件写入三段职责拆出独立 startup orchestration/support 模块，让 `service.ts` 只保留命令级编排。
