# v0.14.137-weixin-channel-plugin

## 迭代完成说明

- 新增独立微信渠道插件包 `@nextclaw/channel-plugin-weixin`，目录位于 `packages/extensions/nextclaw-channel-plugin-weixin`。
- 插件内完成扫码登录、账号/token 持久化、`getupdates` 长轮询收消息、文本回复、主动发文本、`context_token` 复用、多账号 `accountId` 路由。
- 宿主侧补齐最小通用 contract：
  - `openclaw-compat` channel plugin 新增 `auth.login`
  - `nextclaw channels login` 支持 `--channel/--account/--url/--http-url/--verbose`
  - `message` tool、`cron`、service cron 回放、NCP tool registry、agent loop 透传 `accountId`
  - bundled plugins 中加入 `@nextclaw/channel-plugin-weixin`
- 本次实现对应方案文档：
  - [微信渠道独立插件实现方案](../../plans/2026-03-23-weixin-channel-plugin-implementation-plan.md)

## 测试/验证/验收方式

- 构建与类型检查：
  - `pnpm -C packages/extensions/nextclaw-channel-plugin-weixin tsc`
  - `pnpm -C packages/extensions/nextclaw-channel-plugin-weixin lint`
  - `pnpm -C packages/extensions/nextclaw-channel-plugin-weixin build`
  - `pnpm -C packages/nextclaw-core tsc`
  - `pnpm -C packages/nextclaw-core lint`
  - `pnpm -C packages/nextclaw-core build`
  - `pnpm -C packages/nextclaw-openclaw-compat tsc`
  - `pnpm -C packages/nextclaw-openclaw-compat lint`
  - `pnpm -C packages/nextclaw-openclaw-compat build`
  - `pnpm -C packages/nextclaw tsc`
  - `pnpm -C packages/nextclaw lint`
  - `pnpm -C packages/nextclaw build`
- 依赖与锁文件同步：
  - `pnpm install`
- mock 冒烟：
  - 使用隔离目录 `NEXTCLAW_HOME=/tmp/nextclaw-weixin-smoke`
  - 启动本地 mock HTTP 服务模拟 `get_bot_qrcode`、`get_qrcode_status`、`getupdates`、`sendmessage`
  - 校验：
    - 插件 `auth.login` 成功返回 `accountId=wx-bot-1`
    - 账号文件成功写入 `/tmp/nextclaw-weixin-smoke/channels/weixin/accounts/wx-bot-1.json`
    - `createChannel().start()` 成功收到 1 条入站消息
    - 回复当前用户时命中 `context_token=ctx-user-a`
    - 主动发给其他用户时 `context_token` 为空字符串
- 真实微信验收（2026-03-23）：
  - 真实扫码登录成功，返回账号 `1344b2b24720@im.bot`
  - 真实用户消息 `weixin-live-ok` 被 `getupdates` 拉到
  - 基于真实入站消息 `context_token` 发送回复 `nextclaw real reply validation`，用户确认已收到
  - 冷启动主动发送首条验证消息时，上游接口返回 `200 {}`，但用户未收到，因此该能力暂不作为“已验证通过”的对外承诺
- 可维护性闸门：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths ...`

## 发布/部署方式

- 本次未执行正式发布。
- 后续若发布该能力，按仓库既有 NPM/CLI 发布流程执行，并确保：
  - 根 workspace `build/lint/tsc` 已包含 `@nextclaw/channel-plugin-weixin`
  - `pnpm install` 后锁文件与 workspace 依赖一致
  - 发布前至少复跑一次微信 mock 冒烟，确认登录、收消息、回复、主动发消息四段链路仍然通过

## 用户/产品视角的验收步骤

1. 安装含本次改动的 NextClaw 版本。
2. 运行 `nextclaw channels login --channel weixin`，确认命中插件登录流程而不是旧 bridge。
3. 完成扫码后，确认控制台输出插件登录成功与当前 `accountId`。
4. 启动网关或服务，让微信侧发送一条文本消息，确认消息进入 agent 并收到文本回复。
5. 在 agent 中使用 `message` tool，指定 `channel=weixin`、`to=<目标微信用户>`，必要时补 `accountId`，确认可以主动发出文本消息。
6. 若配置了多账号，分别验证默认账号与显式 `accountId` 路由都正确。

## 红区触达与减债记录

### packages/nextclaw-core/src/agent/loop.ts

- 本次是否减债：部分减债
- 说明：本次只为微信渠道新增 `accountId` 透传，未继续往该文件堆叠分支，而是通过压缩局部上下文拼装逻辑把文件行数恢复到改动前基线，避免新增体量继续恶化红区文件。
- 下一步拆分缝：优先拆出 delivery context builder、message tool/cron tool context 组装，以及 `processMessage` / `processSystemMessage` 共享的 channel metadata 读取逻辑。
