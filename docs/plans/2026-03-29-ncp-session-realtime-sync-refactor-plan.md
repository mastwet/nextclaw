# NCP Session Realtime Sync Refactor Plan

日期：2026-03-29

相关文档：

- [ChatPage 重构两条原则](../designs/chat-page-refactor-two-principles.md)
- [NextClaw AppClient Full Request Unification Design](./2026-03-23-nextclaw-appclient-full-request-unification-design.md)

## 1. 目标

本方案的目标不是继续优化轮询参数，而是把 NCP 聊天页的两类职责彻底拆开：

1. 当前会话的消息流继续走现有 NCP stream，只服务当前打开的聊天面板。
2. session 列表改为通过现有 WebSocket 做 typed changefeed，同步的是 session summary，而不是整份列表反复重拉。
3. `React Query` 成为远端 session summary 的唯一缓存源。
4. `Zustand` 只保留本地 UI 状态，不再镜像远端 session 列表。
5. 实现方式必须收敛复杂度，不允许到处加补丁、兜底、双路径和隐式兼容。

## 2. 设计原则

### 2.1 单一职责拆分

- 当前会话 token 流属于 execution path。
- session 列表同步属于 observation path。
- 两者不能再通过 `invalidateQueries(['ncp-sessions'])` 互相牵动。

### 2.2 Pure-read 与 side-effect 分离

- 页面挂载、路由切换、WebSocket 事件处理、query 自动刷新都只能命中 pure-read 链路。
- session summary 同步只能更新缓存，不得触发新的消息流控制、副作用写入或 run 控制。

### 2.3 单一数据源

- 远端 session summary 的 source of truth 是 `React Query` cache。
- `Zustand` 只保留本地 UI 状态，例如：
  - `selectedSessionKey`
  - sidebar query
  - 当前 draft
  - 菜单开关
- 禁止把 `ncp-sessions` 查询结果再复制一份进 `chatSessionListStore`。

### 2.4 不保留双路径

- 不能长期同时保留：
  - `WebSocket changefeed`
  - running 时 `refetchInterval`
  - send/stop 前后手动 `refetchSessions`
  - `session.updated -> invalidateQueries`
- session 同步路径只能保留一条主链路。

### 2.5 抽象要小而硬

本轮不引入“大而全的实时同步框架”。  
只允许沉淀两块稳定抽象：

1. 服务端的 `session summary change` 生产模块
2. 前端的 `session summary query cache patch` 应用模块

如果后续 `config`、`cron`、`runs` 也出现同类需求，再从这两个模块向上提炼通用 changefeed 基础设施。

## 3. 当前现状与问题

### 3.1 已有实时底座，但 session 同步仍是粗粒度刷新

当前仓库已经有现成实时底座：

- app 根部已挂 `useRealtimeQueryBridge(appQueryClient)`
- local transport 已有 `/ws`
- remote transport 已有 `/_remote/ws`
- server 端已有 `UiServerEvent` 广播

但 session 相关事件目前只有：

- `session.updated { sessionKey }`

这个事件只表达“某个 session 变了”，不携带可直接应用的 summary payload。

### 3.2 前端当前做的是 invalidate，不是增量同步

`useRealtimeQueryBridge` 收到 session 事件后，当前逻辑是：

- `invalidateQueries(['ncp-sessions'])`
- 失效对应 `ncp-session-messages`

这会导致 streaming 期间的 session 写入持续触发整份列表重拉，而不是 patch 本地缓存。

### 3.3 轮询与手动 refetch 叠加

当前至少有三条并行刷新链路：

1. `useNcpSessions()` 在存在 running session 时每 `800ms` 轮询整份列表
2. `NcpChatPage` 在 `isSending / activeBackendRunId` 变化时主动 `refetchSessions()`
3. send / stop 前后再次手动 `sessionsQuery.refetch()`

这会把“当前聊天正在流式输出”放大成“整个聊天页都在高频重算”。

### 3.4 远端数据被重复镜像到 Zustand

`NcpChatPage` 当前会把 query 结果回填到多个 store：

- `chatSessionListStore`
- `chatRunStatusStore`
- `chatThreadStore`

其中 `chatSessionListStore` 持有 `sessions`，使 sidebar 和页面状态在 `React Query` 之外又多了一份远端数据镜像。这会造成：

- 数据更新路径变长
- 比较逻辑重复
- 组件重渲染范围扩大
- 后续职责边界越来越模糊

### 3.5 session 事件与 config 事件语义混用

当前 patch/delete session 后还会发布：

- `config.updated { path: 'session' }`

这属于语义混用。session 变化应由 session changefeed 独立表达，而不是借 config 事件旁路触发刷新。

### 3.6 summary 生产责任当前不够清晰

当前本地 `UiSessionService` 生成 `NcpSessionSummary` 时把 `status` 固定成 `idle`。  
这说明“谁负责生产可靠 summary”目前并未收敛，后续实现不能默认依赖前后端各自猜测 summary 的 live 状态。

## 4. 目标架构

目标状态分为三层：

### 4.1 当前会话消息流层

职责：

- 发送消息
- 接收 token 流
- 更新当前打开会话的消息面板
- stop / resume 当前 run

实现：

- 继续复用现有 NCP stream
- 继续由 `useHydratedNcpAgent` 管理当前会话 runtime
- 历史消息仅在进入会话时按需 `GET /api/ncp/sessions/:id/messages`

约束：

- 不负责驱动全局 session 列表同步

### 4.2 Session summary 同步层

职责：

- 维护 session 列表
- 维护列表上的 run/status、updatedAt、messageCount、metadata
- 处理 delete / rename / metadata patch 等 summary 级变化

实现：

- 走现有 WebSocket
- 收到 typed event 后直接 patch `React Query` cache

约束：

- 不失效消息历史 query
- 不驱动 token stream
- 不借道 `config.updated`

### 4.3 本地 UI 状态层

职责：

- 当前选中的 session
- sidebar 搜索词
- 草稿、面板开关、临时 UI 状态

实现：

- 继续使用 `Zustand`

约束：

- 不存远端 session list
- 不存远端 summary 派生出的只读数据，除非该数据确实是本地临时态

## 5. 事件契约设计

### 5.1 第一阶段事件

第一阶段只引入最小必要事件：

```ts
type UiServerEvent =
  | { type: 'session.summary.upsert'; payload: { summary: NcpSessionSummary } }
  | { type: 'session.summary.delete'; payload: { sessionKey: string } }
```

说明：

- `upsert` 用于新建、消息提交、metadata patch、run 状态切换后的 summary 更新
- `delete` 用于会话删除
- payload 直接携带可落库到 query cache 的 summary，前端不再为了一个 `sessionKey` 再回源拉整份列表

### 5.2 第二阶段保留位

为后续扩展保留但第一阶段不实现：

```ts
type SessionRealtimeEnvelope = {
  seq: number;
  eventId: string;
  event:
    | { type: 'session.summary.upsert'; payload: { summary: NcpSessionSummary } }
    | { type: 'session.summary.delete'; payload: { sessionKey: string } };
};
```

第一阶段先不要把 `seq` 强行塞进所有代码路径，避免过早增加复杂度。

### 5.3 reconnect 策略

第一阶段不做 replay。

明确策略是：

1. 首次加载时拉一次 `GET /api/ncp/sessions`
2. 连接稳定时靠 WebSocket patch 保持新鲜
3. WebSocket 断线后重连成功时，显式做一次 `ncp-sessions` 全量 resync

这是一条可解释、可观察、边界明确的 pure-read 补偿策略，不是隐藏兜底。

## 6. 第一阶段实施方案

第一阶段的目标是先把同步模型改对。

### 6.1 服务端

#### 6.1.1 收敛 summary 生产

新增一个纯模块，负责把 session 数据转换成统一 summary，并生成 realtime event。建议形态：

- `packages/nextclaw/src/cli/commands/ncp/ncp-session-summary.ts`
- `packages/nextclaw/src/cli/commands/ncp/ncp-session-summary-change.ts`

职责：

- 从 session record 生成 `NcpSessionSummary`
- 为 delete / upsert 生成稳定的 event payload
- 让 `UiSessionService`、service 启动 wiring、route controller 都复用同一 summary 生产逻辑

这样可以避免：

- `UiSessionService` 一份 summary 逻辑
- `service.ts` 再猜一份
- `router` 再拼一份

#### 6.1.2 升级 session 更新回调

当前回调是：

- `onSessionUpdated(sessionKey)`

应升级为更明确的 change 对象，例如：

```ts
type SessionSummaryChange =
  | { kind: 'upsert'; summary: NcpSessionSummary }
  | { kind: 'delete'; sessionKey: string };
```

`NextclawAgentSessionStore`、`UiSessionService`、`service.ts`、`service-gateway-startup.ts` 统一透传这个 change，而不是只透传 key。

#### 6.1.3 清理混用的 config 事件

session patch / delete 不再发布：

- `config.updated { path: 'session' }`

session 变化只走 session changefeed。

### 6.2 前端

#### 6.2.1 新增 query cache patch 模块

新增一个纯模块，专门负责把 realtime event 应用到 `ncp-sessions` query cache。建议形态：

- `packages/nextclaw-ui/src/api/ncp-session-query-cache.ts`

提供纯函数：

- `upsertNcpSessionSummary(list, summary)`
- `deleteNcpSessionSummary(list, sessionKey)`
- `applyNcpSessionRealtimeEvent(queryClient, event)`

要求：

- 对所有 `['ncp-sessions', *]` 查询统一 patch
- 保持排序规则稳定
- 不引入组件层逻辑
- 单测覆盖 upsert、delete、dedupe、排序

#### 6.2.2 改写 realtime bridge

`useRealtimeQueryBridge` 收到 session 事件后：

- 不再 `invalidateQueries(['ncp-sessions'])`
- 不再失效 `ncp-session-messages`
- 改为调用 `queryClient.setQueriesData(...)` 做增量 patch

#### 6.2.3 删除 polling 与手动 refetch

删除：

- `useNcpSessions()` 的 `refetchInterval`
- `NcpChatPage` 中 running/sending 期间的 `refetchSessions()` effect
- send / stop 前后的 `sessionsQuery.refetch()`

保留：

- 首次加载的 `useNcpSessions()`
- reconnect 后的一次显式 resync

#### 6.2.4 保持历史消息按需加载

`ncp-session-messages` 继续只用于：

- 进入某个 session 时的 seed hydrate
- 手动查看历史时的 pure-read 加载

不能再把 session list changefeed 事件扩散到 message history query。

## 7. 第二阶段实施方案

第二阶段的目标是把数据所有权收干净。

### 7.1 ChatSidebar 直接读 query 视图

新增一个薄的 view hook，例如：

- `useSessionSummariesView()`

职责：

- 从 `useNcpSessions()` 读取远端 summary
- 做 `adaptNcpSessionSummaries`
- 根据 sidebar query 做过滤与分组

`ChatSidebar` 直接消费这个 view hook，不再从 `chatSessionListStore.snapshot.sessions` 读取远端列表。

### 7.2 缩减 `chatSessionListStore`

`chatSessionListStore` 最终只保留本地 UI 状态：

- `selectedSessionKey`
- `selectedAgentId`
- `query`

应删除：

- `sessions`
- `isLoading`

说明：

- `sessions` 是远端数据，应回到 query cache
- `isLoading` 是 query 状态，应从 query 直接读取

### 7.3 收缩 `chatRunStatusStore`

优先目标不是再造一套 run status store，而是让 run 状态尽量由两部分派生：

1. session summary 中的远端状态
2. 当前会话 local agent runtime 的即时状态

如果 `ChatSidebar` 和 `ChatConversationPanel` 仍需要共享少量本地 run 临时态，可以保留最小 store。  
但不再长期维护整份 `sessionRunStatusByKey` 镜像 map，除非验证后确实有跨树共享必要。

### 7.4 Presenter / Manager 边界

第二阶段仍遵循当前 presenter-manager-store 模型，但边界要更清楚：

- presenter / manager 负责 action
- query hook / view hook 负责远端数据读取与只读派生
- store 负责本地 UI 态
- UI 组件不承担远端缓存 patch 逻辑

换句话说，本轮不是推翻 MVP 结构，而是把远端数据从 store ownership 中拿出来。

## 8. 第三阶段实施方案

第三阶段的目标是把 session changefeed 做成真正可扩展的实时同步。

### 8.1 增加顺序标识

新增：

- `seq`
- `eventId`

客户端保存最近成功应用的 `lastSeq`。

### 8.2 支持 replay / backfill

重连后：

1. 尝试携带 `lastSeq` 请求补增量
2. 如果服务端判断 gap 无法补齐，返回显式 resync 指令
3. 客户端再做一次全量 `GET /api/ncp/sessions`

### 8.3 服务端事件合并

如果 streaming 期间 session 持久化仍然非常频繁，应优先选择：

1. 只在语义边界发布 summary event
2. 或在服务端对 summary event 做 `50-200ms` 的 coalescing

不能走的方向：

- 每个 token 都广播一次 session summary upsert
- 前端靠 memo 或虚拟列表硬扛高频全局 patch

## 9. 建议的实现顺序

下一次正式实施建议按下面顺序一次完成：

1. 后端收敛 `summary` 生产模块与 typed event 契约
2. 前端新增 `ncp-session-query-cache` 纯模块和测试
3. 改写 `useRealtimeQueryBridge`
4. 删掉 `useNcpSessions` polling 与 `NcpChatPage` 手动 refetch
5. 清理 `config.updated { path: 'session' }`
6. 将 sidebar 的远端列表读取迁出 `chatSessionListStore`
7. 缩减 `chatSessionListStore` 与 `chatRunStatusStore`
8. 跑完整验证与聊天冒烟

这样做的原因是：

- 先把同步模型改对，再做状态边界收缩
- 先把 source of truth 统一，再做 UI 组件读写收敛
- 避免边改 store 边保留旧刷新链路，导致临时复杂度上升

## 10. 禁止事项

本次实施明确禁止以下做法：

- 为了“先能跑”继续保留 polling + ws patch 双路径
- 继续把 session 变化混入 `config.updated`
- 收到 `session` 事件后失效 `ncp-session-messages`
- 在多个页面 / manager / hook 中分散写 `setQueryData` patch 逻辑
- 新增一个笼统的“realtime manager”神类
- 为兼容旧代码长期保留 `store sessions` 和 `query sessions` 双数据源
- 把 reconnect 补偿做成静默、不可观测、随环境变化的隐藏兜底

## 11. 验收标准

### 11.1 架构层

- 当前会话 token 流与 session 列表同步完全拆开
- session 列表同步只有一条主链路：`WebSocket changefeed -> React Query patch`
- 历史消息只在按需 hydrate / 查看历史时加载

### 11.2 代码层

- session summary change 的生成逻辑有唯一实现
- session query cache patch 的应用逻辑有唯一实现
- `chatSessionListStore` 不再镜像远端 session 列表
- `ChatSidebar` 直接消费 query 视图而不是 store 镜像

### 11.3 用户层

- 长会话 streaming 期间切换会话的卡顿显著下降
- sidebar 不再随着当前会话 token 流出现整表抖动
- 断线重连后 session 列表能恢复到正确状态

### 11.4 验证层

- `pnpm --filter @nextclaw/ui exec vitest run ...`
- `pnpm --filter @nextclaw/ui exec tsc --noEmit`
- 受影响服务端单测
- NCP 聊天冒烟：
  - 打开一个长会话并持续 streaming
  - 同时切换到另一会话
  - 观察 sidebar 与主面板是否仍保持可交互

## 12. 实施判断

这件事应该按“结构性收敛”来做，而不是按“性能 hotfix”来做。

更具体地说，本轮不应该：

- 在现有 polling 基础上再做节流补丁
- 在现有 store 镜像基础上再加更多 memo
- 在现有 `invalidateQueries` 基础上再做条件判断

应该做的是：

- 明确 observation / execution 边界
- 删掉错误的数据同步模型
- 收紧 source of truth
- 用两个小而稳定的抽象模块收口实现复杂度

这才符合后续可维护性逐渐收敛、而不是继续膨胀的方向。
