# v0.14.95-remote-access-overall-execution-plan

## 迭代完成说明

- 新增 remote access 总执行方案文档：
  - [NextClaw Remote Access Overall Execution Plan](../../plans/2026-03-21-nextclaw-remote-access-overall-execution-plan.md)
- 文档将两份专题方案收敛到统一执行顺序：
  - 先执行 [Remote Relay Hibernation Cost Optimization Design](../../plans/2026-03-21-nextclaw-remote-relay-hibernation-cost-optimization-design.md)
  - 再执行 [Account And Remote Access Product Design](../../plans/2026-03-21-nextclaw-account-and-remote-access-product-design.md)
- 文档明确禁止顺序颠倒、长期双轨与 scope 混杂推进。

## 测试/验证/验收方式

- 文档结构检查：
  - 确认总方案文档存在，并能通过 Markdown 链接跳转到两份专题设计文档
- 规则适用性说明：
  - `build` 不适用：本次未触达代码或构建链路
  - `lint` 不适用：本次未触达代码或 lint 规则执行对象
  - `tsc` 不适用：本次未触达 TypeScript 代码
  - 冒烟测试不适用：本次仅新增总方案文档，未改动运行实现

## 发布/部署方式

- 本次为设计文档新增，无需代码发布、部署或 migration
- 后续进入实现阶段时，应单独创建新的更高版本迭代目录记录实现、验证与发布闭环

## 用户/产品视角的验收步骤

1. 打开总方案文档，确认能看到“两阶段、固定顺序”的整体规划。
2. 确认文档明确要求先处理 DO / relay 成本问题，再处理账号与 remote 产品面重构。
3. 确认文档已引用两份专题方案，而不是重新发明第三套平行方案。
4. 确认文档明确限制当前 scope，不把账号中心、订阅 UI、协作权限等额外能力混入本轮。
