# v0.14.207-feishu-single-runtime-release

## 迭代完成说明

- 保留插件式飞书实现，彻底删除 `@nextclaw/channel-runtime` 中的旧 `FeishuChannel`、其入站媒体下载辅助模块与对应测试，避免仓库继续维护两套飞书实现。
- 补强 [`packages/nextclaw/src/cli/commands/service-plugin-runtime-bridge.ts`](../../../packages/nextclaw/src/cli/commands/service-plugin-runtime-bridge.ts)，让 `MediaPath` / `MediaPaths` / `MediaUrl` / `MediaUrls` 不仅能映射成 `attachments`，而且在“纯附件、无正文”的情况下也会继续下发给 agent。
- 补充 bridge 回归测试，覆盖“只有图片附件没有文字”场景。
- 已完成联动发版，核心版本为：
  - `@nextclaw/channel-runtime@0.4.2`
  - `@nextclaw/openclaw-compat@0.3.28`
  - `@nextclaw/mcp@0.1.47`
  - `@nextclaw/server@0.10.51`
  - `nextclaw@0.15.9`

## 测试/验证/验收方式

- 定向测试与构建：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw exec vitest run src/cli/commands/service-plugin-runtime-bridge.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-channel-runtime tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/extensions/nextclaw-channel-runtime build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
- 发布前全量校验：
  - `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:publish`
- 发布后 registry 校验：
  - `PATH=/opt/homebrew/bin:$PATH npm view nextclaw@0.15.9 version dependencies --json`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/openclaw-compat@0.3.28 version dependencies --json`
  - `PATH=/opt/homebrew/bin:$PATH npm view @nextclaw/channel-runtime@0.4.2 version dependencies --json`
  - `NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-feishu-release-smoke-XXXXXX) PATH=/opt/homebrew/bin:$PATH pnpm dlx nextclaw@0.15.9 plugins list --json`
- 关键观察点：
  - `nextclaw@0.15.9` 已指向 `@nextclaw/openclaw-compat@0.3.28`、`@nextclaw/server@0.10.51`、`@nextclaw/mcp@0.1.47`
  - `@nextclaw/channel-runtime@0.4.2` 已不再依赖 `@nextclaw/feishu-core`
  - registry 安装态下只加载新的 `feishu` 插件入口，不再存在旧 runtime 飞书入口

## 发布/部署方式

- 本次已完成 changeset version/publish/tag 闭环，无需额外前端单独发布。
- 如线上已有运行中的 NextClaw 服务，升级到 `nextclaw@0.15.9` 后重启服务进程即可生效。
- 若使用全局安装，可执行：
  - `pnpm add -g nextclaw@0.15.9`
  - 或使用既有升级路径安装到该版本。

## 用户/产品视角的验收步骤

1. 升级到 `nextclaw@0.15.9` 并重启服务。
2. 在飞书会话里发送一张图片并附一句话，例如“这张图里有什么？”。
3. 确认机器人回复基于图片内容，而不是只把本地路径或资源 key 当普通文本复述。
4. 再发送一条只有图片、没有文字的消息，确认机器人仍能收到图片附件并正常响应。
5. 如需核对加载链路，执行 `nextclaw plugins list --json`，确认飞书显示为 `feishu` 插件，而不是旧 builtin runtime。
