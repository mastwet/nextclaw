# v0.14.141-weixin-ui-server-wiring-fix

## 迭代完成说明

- 修复 `startUiServer()` 到 `createUiRouter()` 的真实启动链路漏传插件 channel getter 的问题。
- 根因是服务端虽然定义了 `getPluginChannelBindings` / `getPluginUiMetadata`，但实际创建 UI router 时没有把这两个参数传下去，导致真实服务启动后 `/api/config` 与 `/api/config/meta` 看不到插件投影出来的 `weixin`。
- 本次补了一条走 `startUiServer()` 的真实链路测试，直接验证服务启动后 `weixin` 会出现在配置接口里，避免再出现“controller 单测通过，但真实服务不通”的假绿。

## 测试/验证/验收方式

- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server tsc`
- 服务端真实链路测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server test -- server.weixin-channel.test.ts router.weixin-channel-config.test.ts`
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw build`
- 可维护性闸门：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-server/src/ui/server.ts packages/nextclaw-server/src/ui/server.weixin-channel.test.ts`
- 额外记录：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw tsc` 当前仍会被仓库内无关脏改动阻塞，错误位于 `packages/nextclaw-remote/src/remote-app.adapter.ts:121`，与本次微信修复无关。

## 发布/部署方式

- 本次仅补发真正受影响的两个包：
  - `@nextclaw/server@0.10.30`
  - `nextclaw@0.13.34`
- 发布命令：
  - `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc npm publish --access public`（在 `packages/nextclaw-server` 目录执行）
  - `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc npm publish`（在 `packages/nextclaw` 目录执行）
- 发布后校验：
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/server version`
  - `PATH=/opt/homebrew/bin:$PATH npm view nextclaw version`

## 用户/产品视角的验收步骤

1. 安装 `nextclaw@0.13.34`。
2. 启动服务后打开前端 `Channels` 页面。
3. 确认渠道列表里能看到 `Weixin`，而不是只有 `wecom`。
4. 打开 `Weixin` 配置项，确认能看到微信专属字段并正常保存。
5. 如本地已登录微信插件账号，再发一条消息，确认现有收消息与回复链路继续正常。
