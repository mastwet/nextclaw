# NextClaw Remote Relay Hibernation Cost Optimization Design

日期：2026-03-21

## 1. 背景与问题定义

当前 remote access relay 已经证明功能可用，但 Cloudflare Durable Objects 免费额度会非常快地被打满。

这不是偶发现象，也不是单纯“请求有点多”，而是当前架构与当前实现方式决定的结果：

- 当前 relay 采用 `一台设备一个 Durable Object` 的状态模型。
- 本地 connector 与 Durable Object 之间建立长期 WebSocket 连接。
- Durable Object 当前使用普通 `WebSocket.accept()` 持有连接，而不是 Durable Object 的 WebSocket Hibernation 机制。
- connector 还在固定周期发送应用层 ping，并且 DO 收到 ping 后会持续写 D1 更新 `last_seen_at`。

在这个实现下，只要设备常驻在线，DO duration 就几乎会按全天累计；随着设备数增加，免费额度必然线性爆炸。

因此，本次问题的本质不是“要不要继续做 remote access”，也不是“要不要先付费止血”，而是：

**必须把 relay 从“常驻活跃 DO”改造成“可休眠、按事件唤醒的 DO”。**

## 2. 核心结论

本方案只采用一条路线，不保留双轨：

1. 继续保留 Durable Objects。
2. 不采用付费止血作为产品方案。
3. 不改成第二套自建 relay 服务。
4. 直接把现有 relay 改造成基于 Durable Object WebSocket Hibernation 的实现。
5. 同时去掉高频心跳写库与高频会话触达写库，避免把 duration 问题转移成 D1 写入问题。

一句话概括：

**保留 DO 作为“按设备寻址的状态中枢”，但把它从“常驻运行中继”改造成“休眠优先、事件驱动中继”。**

## 3. 为什么不是废掉 DO

在当前产品约束下，relay 层要满足的是：

- 每个远程请求都能按 `deviceId` 找到当前在线的那条本地 connector 连接
- 平台无需直接托管本地业务执行
- 浏览器打开设备后仍复用本地 NextClaw UI / API
- 后续还能扩展为长期正式产品能力

这类问题天然需要一个“按设备寻址、可持有连接、可被平台请求命中”的状态ful 中枢。

在 Cloudflare 体系内，Durable Objects 仍然是最贴合这个模型的原语。问题不在于“用了 DO”，而在于“用了最贵的 DO 用法”。

因此，本次优化的目标不是替换原语，而是修正原语的使用方式。

## 4. 主约束与设计原则

### 4.1 Primary Contract

本方案的 primary contract 是：

- 设备在线时，平台可以稳定地把远程请求转发给该设备
- 设备空闲时，不应持续消耗高额 duration
- 平台设备状态必须明确、可预测，不能依赖高频心跳刷表伪造“在线”

### 4.2 只保留唯一正式路径

本方案不保留：

- “先继续普通 DO，之后再考虑 hibernation”
- “免费层不够时再手动升级付费”
- “同时维护 hibernation 和旧 accept 双实现”

原因很简单：

- 双路径会让运行时行为不可预测
- 旧实现会继续掩盖成本模型错误
- 成本问题不是异常边角，而是当前主链路的结构性问题

### 4.3 休眠优先，事件驱动

DO 的职责是：

- 保存设备连接的可寻址性
- 在请求到来时唤醒并转发
- 在响应回来时短时活跃

DO 的职责不是：

- 作为常驻活跃进程持续占用 duration
- 通过高频 ping 驱动数据库在线态

### 4.4 状态变更写库，而不是心跳写库

设备状态应该由明确状态机驱动：

- connector connected
- connector disconnected
- connector replaced

而不是每 15 秒写一次“我还活着”。

### 4.5 会话活跃度写库必须节流

`remote_sessions.last_used_at` 是审计/可观测性字段，不是主链路状态源。

因此：

- 可以更新
- 但不能每个 proxied request 都更新

## 5. 当前实现的结构性成本点

### 5.1 DO 长连接以普通 accept 持有

当前代码在 DO 内直接执行普通 `server.accept()`，这会让 DO 在连接存活期间持续活跃，无法进入 hibernation。

这正是 duration 被持续累计的核心原因。

### 5.2 应用层 ping 触发持续唤醒

当前 connector 固定周期发送 JSON ping。

如果保留这种高频应用层消息，即使改成 hibernation，也会不断把 DO 从休眠态唤醒，持续吃 duration。

### 5.3 ping 驱动 D1 高频写入

当前 ping 还会触发 `touchRemoteDevice()`。

这会把原本的 duration 问题转移成 D1 `rows written` 压力，并让“在线状态”依赖一个高频刷表机制。

### 5.4 每个远程请求都 touch session

当前每个 proxied request 都会更新 `remote_sessions.last_used_at`。

这也是不必要的高频写入。该字段只需要反映“最近使用过”，不需要精确到每个请求。

## 6. 目标架构

优化后的架构仍然保持原来的产品边界：

```text
Remote Browser
  -> Platform Worker
  -> Remote Relay Durable Object
  -> Local Connector
  -> Local NextClaw UI / API
```

变化只发生在 relay 的行为模型：

```text
旧模型：
长期活跃 DO
  + 普通 accept
  + 高频 ping 唤醒
  + 高频写 D1

新模型：
休眠优先 DO
  + Hibernation accept
  + 按请求/响应唤醒
  + 连接状态变更写 D1
  + 会话活跃度节流写 D1
```

## 7. 核心改造方案

### 7.1 保留一设备一 DO

这一点不改。

原因：

- `deviceId -> connector websocket` 的寻址模型是正确的
- 一设备一 DO 让平台可以稳定命中目标连接
- 后续权限、共享、协作等能力仍然能基于这个模型扩展

本次不改“谁负责寻址”，只改“DO 如何持有连接、如何落状态”。

### 7.2 把 connector WebSocket 改成 Hibernation 模式

DO 与 connector 的连接不再使用普通 `ws.accept()`。

改为：

- 使用 Durable Object 的 WebSocket hibernation accept API
- 通过 DO 官方事件回调处理 message / close
- 在 DO 被唤醒后，通过官方恢复接口重新拿到已附着的 WebSocket 连接

目标行为：

- 设备在线但空闲时，DO 处于休眠，不持续消耗高额 duration
- 远程请求进入时，DO 被唤醒，转发请求
- connector 回复时，DO 被唤醒，返回响应
- 空闲后再次回到休眠态

### 7.3 连接元数据从内存变量转为可恢复元数据

当前 DO 依赖进程内变量：

- `connector`
- `deviceId`
- `pending`

在 hibernation 方案下：

- `connector` 不能只靠内存变量存在
- `deviceId` 也不能只放在类字段里

因此需要把“当前这条 WebSocket 对应哪个设备、什么角色”的元数据附着到 WebSocket 或 DO 可恢复状态中。

建议：

- 设备标识、连接类型、连接建立时间等元数据跟随 WebSocket attachment 持久化
- DO 唤醒时以恢复后的 WebSocket 集合为准，而不是以类字段为准

### 7.4 彻底去掉“高频业务 ping 驱动在线状态”

本方案不保留当前 15 秒 JSON ping 作为主状态驱动机制。

原因：

- 它会不断唤醒 DO
- 它会不断写 D1
- 它让“在线”依赖刷表而非真实连接状态

优化后：

- 设备 `online/offline` 以 connector 连接建立和连接关闭事件为准
- 如果确实需要 keepalive，只允许使用不会把业务链路持续拉活的最小机制
- 不允许再通过应用层高频 ping + 落库来维持“在线”

### 7.5 设备在线状态改成“连接状态变更驱动”

当前平台设备页将 `last_seen_at` 30 秒 freshness 作为在线判断依据。

这套机制应当废弃。

优化后建议：

- connector 建立连接时：写一次 `status=online`
- connector 正常关闭 / 被替换 / 错误断开时：写一次 `status=offline`
- 设备列表默认直接读取 `status`

这样做的好处：

- 状态语义清晰
- 不再依赖高频写库
- 不再需要 30 秒 freshness 猜测

如果后续需要“最近活跃时间”，可以保留 `last_seen_at`，但它不再承担在线真相源角色。

### 7.6 `last_seen_at` 改成低频可观测字段

`last_seen_at` 仍然可以保留，但只用于可观测性，而不是在线态判断。

建议更新时机：

- connector 建立连接
- connector 关闭连接
- 可选：每隔一个较大周期做一次粗粒度触达写入

建议默认不要小于分钟级，更不能是 15 秒级。

### 7.7 `remote_sessions.last_used_at` 改成节流更新

当前每个 proxied request 都写一次 `touchRemoteSession()`，这没有必要。

建议改成：

- 读取 session 时带出当前 `last_used_at`
- 仅当 `now - last_used_at >= sessionTouchThrottleWindow` 时才写库

推荐窗口：

- 1 分钟到 5 分钟之间

这样既保留“最近使用过”的可观测性，也不会把高频请求转成高频写库。

### 7.8 请求处理仍保持当前 proxy 模型

本方案不改动核心 proxy 方向：

- 平台 Worker 仍根据 session 找到 device
- 仍命中该设备对应的 DO
- DO 仍通过 frame 协议把请求转给 connector
- connector 仍桥接到本地 NextClaw UI / API

也就是说：

- 改的是连接生命周期和状态存储
- 不改业务面与协议面的大方向

## 8. 目标状态机

### 8.1 设备连接状态

建议固定为以下状态：

- `offline`
- `connecting`
- `online`
- `replaced`
- `error`

平台最终对用户默认只需收敛成：

- `online`
- `offline`
- `error`

### 8.2 状态转换

#### 建立连接

- connector 连接 DO
- DO 接收并登记该连接
- 若已有旧连接，旧连接标记为 `replaced` 并关闭
- D1 写 `status=online`

#### 空闲

- 没有请求 / 响应事件
- DO 进入休眠
- 不写库

#### 收到远程请求

- 平台命中 DO
- DO 唤醒
- 找到 connector WebSocket
- 转发请求

#### connector 返回响应

- DO 处理响应
- 完成 proxy
- 空闲后继续休眠

#### 断开连接

- connector 正常关闭、错误断开或被替换
- D1 写 `status=offline`

## 9. 代码层改造边界

### 9.1 `workers/nextclaw-provider-gateway-api/src/remote-relay-do.ts`

这是主改造位，职责包括：

- 切到 DO hibernation 接入方式
- 改写 websocket 生命周期管理
- 改写连接恢复逻辑
- 改写设备在线状态写库时机
- 保留 request/response frame proxy 能力

### 9.2 `packages/nextclaw-remote/src/remote-connector.ts`

职责调整：

- 不再默认发送高频业务 ping
- 如保留保活，也必须与 DO hibernation 相容
- 继续作为本地 UI 的请求桥接器

### 9.3 `workers/nextclaw-provider-gateway-api/src/controllers/remote-controller.ts`

职责调整：

- 设备列表不再依赖 `last_seen_at <= 30s` 推断在线
- `openRemoteDevice` 不再依赖 freshness 检查
- `touchRemoteSession()` 改成节流更新

### 9.4 `workers/nextclaw-provider-gateway-api/src/repositories/remote-repository.ts`

职责调整：

- 明确区分 `status` 与 `last_seen_at` 的语义
- 增加节流更新所需的最小 repository 能力

## 10. 可观测性与运维

### 10.1 必须保留的观测字段

- connector 当前是否存在
- 设备当前 status
- 最近连接时间
- 最近断开时间
- 最近 session 使用时间
- 最近 relay 错误

### 10.2 不再保留的伪观测

不再把以下内容当作在线真相源：

- 高频 ping 时间
- 30 秒 freshness 猜测

### 10.3 日志要求

- 记录连接建立、连接替换、连接关闭、proxy timeout、proxy error
- 不记录原始 token
- 不通过日志输出高频心跳噪音

## 11. 实施顺序

### 11.1 第一阶段：切换 DO WebSocket 生命周期

- 将 connector upgrade 改为 hibernation 接入
- 建立连接恢复能力
- 保证 `deviceId -> connector` 寻址仍然成立

### 11.2 第二阶段：去掉高频 ping 在线机制

- 移除或显著弱化业务层 ping
- 不再通过 ping 写 D1 更新在线状态

### 11.3 第三阶段：改写平台在线态判断

- 设备列表与打开设备逻辑切换到 `status` 驱动
- 移除 30 秒 freshness 推断

### 11.4 第四阶段：会话触达节流

- 为 `remote_sessions.last_used_at` 增加节流更新
- 验证高频请求下 D1 写入显著下降

## 12. 验收标准

### 12.1 行为验收

- 设备在线但空闲时，remote access 仍可被远程打开
- 设备空闲期间 DO 不再持续累积高 duration
- 设备在线状态不再依赖 15 秒心跳刷表
- 设备断线后平台状态能明确转为 offline
- 高频远程请求下，`remote_sessions` 不再每请求都写库

### 12.2 成本验收

- 单设备长时间空闲在线时，duration 曲线明显下降
- D1 `rows written` 不再随心跳线性增长
- D1 `rows written` 不再随每次 proxied request 线性增长

### 12.3 可维护性验收

- relay 只保留一套正式路径
- 无“旧 accept + 新 hibernation”长期双轨
- 在线状态语义清晰：`status` 是真相源，`last_seen_at` 是观测字段

## 13. 风险与应对

### 13.1 风险：DO 唤醒后连接恢复处理复杂度上升

这是必须承担的复杂度，因为它换来的是成本模型根本改善。

应对：

- 把连接元数据和恢复逻辑集中在 `remote-relay-do.ts`
- 不把恢复逻辑散落到 controller 或 repository

### 13.2 风险：移除高频 ping 后，平台在线态暴露出真实边界

这不是缺点，而是好事。

之前的“高频刷表在线”本质上是把错误成本藏了起来。现在应该让状态语义回到真实连接状态。

### 13.3 风险：切换期兼容复杂

本方案不建议长期保留双轨兼容。

允许短期开发期切换，但正式上线目标必须是唯一运行路径，避免成本与行为模型再次分叉。

## 14. 结论

对于 NextClaw 当前的 remote access 模型，最低长期成本方案不是废掉 DO，也不是先付费止血，而是：

**继续使用 DO，但立即切到 Hibernation 路线，并同步去掉高频写库机制。**

最终结果应该是：

- DO 只在真正有请求或消息时活跃
- 设备在线态由连接状态机驱动，而不是心跳刷表驱动
- 会话活跃度是节流更新的观测信息，而不是每请求都写的主链路副作用

这条路线既保留现有产品方向，也把当前最主要的成本问题从结构上解决掉。
