# v0.0.1-telegram-ack-reaction-align

## 迭代完成说明（改了什么）

- Telegram 渠道新增 OpenClaw 风格的 ACK 表情能力：
  - `channels.telegram.ackReaction`（默认 `"👀"`）
  - `channels.telegram.ackReactionScope`（默认 `"all"`）
- Telegram 入站消息在通过基础策略校验后，会先尝试调用 `setMessageReaction` 打 ACK 表情，再进入后续处理流程。
- ACK scope 支持：`off`、`group-mentions`、`group-all`、`direct`、`all`。
- 已补充配置 schema label/help 与中英文渠道文档示例，确保 UI 与文档可见。

## 测试/验证/验收方式

- 构建验证：
  - `pnpm build`
- 代码规范验证：
  - `pnpm lint`
- 类型验证：
  - `pnpm tsc`
- 冒烟验证（默认值生效）：
  - `node --input-type=module -e "import { ConfigSchema } from './packages/nextclaw-core/dist/index.js'; const cfg = ConfigSchema.parse({}); console.log(cfg.channels.telegram.ackReactionScope, cfg.channels.telegram.ackReaction);"`
  - 预期输出包含：`all 👀`

## 发布/部署方式

- 本次改动为 Telegram 渠道运行时 + 配置 schema + 文档更新，不涉及数据库或后端 migration。
- 按常规包发布流程执行（如需对外发布）：
  - `pnpm changeset`
  - `pnpm release:version`
  - `pnpm release:publish`

## 用户/产品视角的验收步骤

1. 在配置文件或 UI 中开启 Telegram 渠道，并确认未改动默认值（`ackReactionScope=all`，`ackReaction=👀`）。
2. 给机器人发送一条私聊消息，观察消息先出现 👀 反应，然后机器人继续回复。
3. 在群聊发送消息，观察同样会先出现 👀（因为默认 scope 为 `all`）。
4. 将 `ackReactionScope` 改为 `direct` 后重试：私聊应有 👀，群聊应不再打 👀。
5. 将 `ackReaction` 置空字符串后重试：不应再发送 ACK 表情。
