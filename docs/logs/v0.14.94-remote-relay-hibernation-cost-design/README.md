# v0.14.94-remote-relay-hibernation-cost-design

## 迭代完成说明

- 新增 remote relay 成本优化方案文档：
  - [NextClaw Remote Relay Hibernation Cost Optimization Design](../../plans/2026-03-21-nextclaw-remote-relay-hibernation-cost-optimization-design.md)
- 本方案明确拒绝“先付费止血、后面再说”的路线，直接收敛到唯一推荐方向：
  - 保留 Durable Objects
  - 改为 WebSocket Hibernation 模式
  - 去掉高频 ping 驱动在线状态
  - 去掉高频 `touchRemoteSession` 写库
- 文档同时明确了在线状态语义调整：
  - `status` 成为在线真相源
  - `last_seen_at` 降级为低频可观测字段

## 测试/验证/验收方式

- 文档结构检查：
  - 确认方案文档存在，并可通过 README 中的 Markdown 链接跳转
- 规则适用性说明：
  - `build` 不适用：本次未触达代码或构建链路
  - `lint` 不适用：本次未触达代码或 lint 规则执行对象
  - `tsc` 不适用：本次未触达 TypeScript 代码
  - 冒烟测试不适用：本次仅新增基础设施设计文档，未改动运行实现

## 发布/部署方式

- 本次为设计文档新增，无需代码发布、部署或 migration
- 后续进入实现阶段时，应单独创建新的更高版本迭代目录记录实现、验证与发布闭环

## 用户/产品视角的验收步骤

1. 打开方案文档，确认只保留一条正式路线，而不是多方案并存。
2. 确认文档明确将 DO 优化方向固定为 WebSocket Hibernation。
3. 确认文档明确要求废弃高频心跳刷在线与高频会话写库。
4. 确认文档明确要求 `status` 取代 30 秒 freshness 成为在线真相源。
