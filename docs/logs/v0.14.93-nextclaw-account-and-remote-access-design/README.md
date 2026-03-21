# v0.14.93-nextclaw-account-and-remote-access-design

## 迭代完成说明

- 新增账号与远程访问边界重构方案文档：
  - [NextClaw Account And Remote Access Product Design](../../plans/2026-03-21-nextclaw-account-and-remote-access-product-design.md)
- 文档明确了以下设计结论：
  - `账号登录` 必须升级为前端全局能力，不再作为 remote access 子功能存在
  - `remote access` 默认只保留设备开关、连接状态、设备名与通往网页版的入口
  - `platform.nextclaw.io` 继续可作为实现载体，但不应成为用户主心智
  - Cloudflare relay / Durable Objects 成本问题单独讨论，不与本次产品面设计混写

## 测试/验证/验收方式

- 文档结构检查：
  - 确认方案文档存在并可通过 README 中的 Markdown 链接跳转
- 规则适用性说明：
  - `build` 不适用：本次未触达代码或构建链路
  - `lint` 不适用：本次未触达代码或 lint 规则执行对象
  - `tsc` 不适用：本次未触达 TypeScript 代码
  - 冒烟测试不适用：本次未触达用户可运行行为实现，仅新增方案文档

## 发布/部署方式

- 本次为设计文档新增，无需代码发布、部署或 migration
- 后续若基于本方案进入实现阶段，应单独创建新的迭代目录记录实现与验证闭环

## 用户/产品视角的验收步骤

1. 打开方案文档，确认能看到“全局账号能力”和“Remote Access 最小化产品面”两条主线。
2. 确认文档明确要求将账号能力提升为全局 presenter / manager / store 能力，而不是继续挂在 remote 页面里。
3. 确认文档明确要求 remote 页面默认只保留开关、状态、设备名和网页版入口。
4. 确认文档已将 Cloudflare 成本问题定义为单独议题，避免与产品边界设计混在一起。
