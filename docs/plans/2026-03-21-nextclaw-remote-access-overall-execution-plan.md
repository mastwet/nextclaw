# NextClaw Remote Access Overall Execution Plan

日期：2026-03-21

## 1. 背景

NextClaw 当前的 remote access 需要同时解决两类问题：

1. 基础设施问题：Cloudflare Durable Objects 当前成本模型不成立，免费额度会被快速打满。
2. 产品与前端架构问题：账号能力和 remote access 边界不清，普通用户主路径仍然暴露过多内部概念。

这两个问题都必须解决，但它们不应该混在一个实现阶段里并行发散。

本总方案的目标是：

- 先明确总方向与实施顺序
- 把两份专题方案纳入同一个执行框架
- 避免后续实现时 scope 漂移或顺序颠倒

## 2. 总体判断

本次总改造按两个阶段推进，但属于同一个总体目标：

### 第一阶段

先解决 remote relay / Durable Objects 成本与行为模型问题。

原因：

- 这是当前 remote access 的结构性阻塞项
- 如果不先处理，后续 remote 产品面继续推广会持续踩配额上限
- 设备在线状态、session 活跃度、连接语义都需要先稳定下来，前端产品面才能建立在可预测状态之上

### 第二阶段

在底层连接与状态语义稳定后，再做账号能力与 remote access 产品面重构。

原因：

- `Account` 与 `Remote Access` 的边界需要建立在稳定状态模型之上
- 否则前端刚完成全局账号能力与 remote 页面极简化，底层状态语义又会反复变化

## 3. 执行顺序

本次总改造的唯一推荐顺序是：

1. `DO / relay hibernation cost optimization`
2. `Account global capability + Remote Access product refactor`

不建议的顺序：

- 先做产品面，再回头修 relay 成本
- 两个阶段在同一轮实现中完全并行推进
- 在第一阶段未完成前继续扩展 remote 产品可见能力

## 4. 阶段一方案引用

第一阶段直接采用以下专题文档：

- [NextClaw Remote Relay Hibernation Cost Optimization Design](./2026-03-21-nextclaw-remote-relay-hibernation-cost-optimization-design.md)

第一阶段的核心目标：

- 保留 Durable Objects
- 切换到 WebSocket Hibernation 路线
- 去掉高频 ping 驱动在线状态
- 去掉高频 `touchRemoteSession` 写库
- 让 `status` 成为在线真相源
- 让 `last_seen_at` 与 `last_used_at` 回到低频可观测字段角色

第一阶段完成前，不进入第二阶段的正式实现。

## 5. 阶段二方案引用

第二阶段直接采用以下专题文档：

- [NextClaw Account And Remote Access Product Design](./2026-03-21-nextclaw-account-and-remote-access-product-design.md)

第二阶段的核心目标：

- 将 `Account` 提升为前端全局能力
- 让登录能力可被其它模块统一唤起
- 为 shell 提供统一账号状态展示位
- 将 remote access 收缩为依赖账号的设备能力
- 默认只保留远程访问开关、连接状态、设备名与网页版入口

第二阶段默认建立在第一阶段的稳定状态模型之上：

- 设备在线状态清晰
- 远程连接状态清晰
- session 活跃度语义清晰

## 6. 实施边界

### 6.1 第一阶段允许触达

- `workers/nextclaw-provider-gateway-api`
- `packages/nextclaw-remote`
- remote 相关 repository / controller / relay runtime

### 6.2 第二阶段允许触达

- `packages/nextclaw-ui`
- `packages/nextclaw-server`
- `packages/nextclaw`
- shell / presenter / manager / store / remote 页面与账号入口

### 6.3 本轮不做

本总方案明确不在当前范围内扩展以下内容：

- 完整账号中心
- token 管理 UI
- 订阅/计费 UI
- 远程访问分享/协作权限
- 第二套云端业务 UI
- 与当前专题文档无直接关系的新 remote feature

## 7. 验收门槛

### 7.1 第一阶段验收门槛

- 空闲在线设备不再持续消耗高额 DO duration
- 设备在线状态不再依赖高频刷表
- 高频远程请求下不再每请求都写 `remote_sessions.last_used_at`
- relay 只保留一套正式路径，不长期维护旧实现双轨

### 7.2 第二阶段验收门槛

- 全局存在统一账号入口与登录状态展示位
- 任意业务模块可通过 presenter/manager 唤起登录能力
- remote 页面不再默认暴露平台底层概念、服务控制和诊断细节
- 用户主路径收敛为“登录 NextClaw -> 开启远程访问 -> 在网页版打开设备”

## 8. 风险控制

### 8.1 最大风险

最大的风险不是技术实现本身，而是 scope 交叉：

- 在 relay 还没稳定前提前收 remote 页面
- 在账号边界还没定清前继续把平台能力长到 remote 页面里
- 为了兼容旧路径长期保留双轨

### 8.2 风险控制原则

- 顺序必须固定：先基础设施，后产品面
- 每个阶段都必须独立可验收
- 不允许在第一阶段夹带第二阶段的大量 UI 改造
- 不允许在第二阶段重新打开第一阶段已经收敛的基础设施路线

## 9. 结论

这次 remote access 总改造不是一个“大杂烩重构”，而是一个顺序明确的双阶段项目：

1. 先用 hibernation 路线修正 DO 成本与状态语义
2. 再把账号能力提升为全局能力，并把 remote access 收缩成极简设备能力

后续所有实现与讨论都应以这两个专题方案为依据，并遵守这个总执行顺序。
