# v0.14.140-weixin-ui-config-entry

## 迭代完成说明

- 补齐前端“消息渠道”页面里的 `weixin` 入口，让用户可以像内建渠道一样在 UI 中查看、编辑并保存个人微信渠道配置。
- 保持微信渠道继续作为独立插件实现，不把插件重新耦合回一套内建 channel 包；服务端把插件 channel 投影成 UI 可配置渠道，保存时再写回 `plugins.entries.nextclaw-channel-weixin.config`。
- 新增前端字段与文案：`defaultAccountId`、`baseUrl`、`pollTimeoutMs`、`allowFrom`、`accounts` JSON，并补 `weixin` logo 与渠道说明。
- 为避免继续恶化红区文件，本次同步把插件 channel 投影逻辑、渠道表单字段定义、渠道 i18n 文案、UI chat runtime 装配拆到独立文件。

## 测试/验证/验收方式

- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/openclaw-compat tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw tsc`
- 定向测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server test -- router.weixin-channel-config.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui test src/components/config/ChannelsList.test.tsx`
- 可维护性闸门：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-server/src/ui/config.ts packages/nextclaw-ui/src/components/config/ChannelForm.tsx packages/nextclaw-ui/src/lib/i18n.ts packages/nextclaw/src/cli/commands/service.ts packages/nextclaw-server/src/ui/plugin-channel-config.projection.ts packages/nextclaw-ui/src/components/config/channel-form-fields.ts packages/nextclaw-ui/src/lib/i18n.channels.ts packages/nextclaw/src/cli/commands/service-ui-chat-runtime.ts`
- 功能验收：
  - 真实微信扫码登录、入站消息、基于 `context_token` 的回复链路已在上一轮微信插件发布时完成真实验证。
  - 本轮额外验收目标为：UI 能展示 `weixin` 渠道、能编辑并保存字段，保存结果能正确回写到插件配置视图。

## 发布/部署方式

- 本次已定向发布 4 个包：
  - `@nextclaw/openclaw-compat@0.3.15`
  - `@nextclaw/server@0.10.29`
  - `@nextclaw/ui@0.9.14`
  - `nextclaw@0.13.33`
- 发布时使用仓库根 `.npmrc`：
  - `NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc`
- 实际发布命令：
  - `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc npm publish --access public`（在 `packages/nextclaw-openclaw-compat`、`packages/nextclaw-server`、`packages/nextclaw-ui` 目录执行）
  - `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc npm publish`（在 `packages/nextclaw` 目录执行）
- 发布后校验：
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/openclaw-compat version` 返回 `0.3.15`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/server version` 返回 `0.10.29`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/ui version` 返回 `0.9.14`
  - `PATH=/opt/homebrew/bin:$PATH npm view nextclaw version` 返回 `0.13.33`

## 用户/产品视角的验收步骤

1. 安装包含本次版本的 `nextclaw`。
2. 打开前端配置页，进入 `Channels`，确认能看到 `Weixin`，且不再把 `wecom` 误当成个人微信入口。
3. 点击 `Weixin`，确认能看到 `Enabled`、`Default Account ID`、`API Base URL`、`Long Poll Timeout (ms)`、`Allow From`、`Accounts JSON` 等字段。
4. 保存配置后，重开页面确认配置回显正常。
5. 启动服务并让微信账号收一条消息，确认现有微信插件链路仍能正常收消息和回复。

## 红区触达与减债记录

### packages/nextclaw-server/src/ui/config.ts

- 本次是否减债：部分减债
- 说明：本次没有继续把插件 channel 投影逻辑堆在 `config.ts` 里，而是抽出 `plugin-channel-config.projection.ts`，并把 `config.ts` 行数压回到改动前基线，避免红区文件继续膨胀。
- 下一步拆分缝：优先把 provider/search/channel 三类配置视图构建进一步拆成独立模块，逐步把 `config.ts` 从聚合型大文件拆成域内 mapper/service 组合。
