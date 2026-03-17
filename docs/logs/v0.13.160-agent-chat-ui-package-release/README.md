# v0.13.160-agent-chat-ui-package-release

## 迭代完成说明
- 完成 `@nextclaw/agent-chat-ui` 首次独立发布闭环。
- 完成 `@nextclaw/ui` 依赖新包后的联动发布。
- 同步完成受 changeset 联动影响的一批内部包升版、changelog 生成、git tag 生成与远端推送。
- 发布提交已推送到 `master`，关键发布 tags 已推送到远端。

## 测试 / 验证 / 验收方式
- `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:check`
- `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:version`
- `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:publish`
- 远端校验：`git ls-remote origin refs/heads/master`
- 远端校验：`git ls-remote --tags origin 'refs/tags/@nextclaw/agent-chat-ui@0.1.1' 'refs/tags/@nextclaw/ui@0.7.0' 'refs/tags/@nextclaw/core@0.8.0' 'refs/tags/@nextclaw/server@0.7.0' 'refs/tags/nextclaw@0.10.0'`
- npm 校验：
  - `npm view @nextclaw/ui version`
  - `npm view @nextclaw/core version`
  - `npm view @nextclaw/server version`
  - `npm view nextclaw version`
  - `npm access get status @nextclaw/agent-chat-ui`

## 发布 / 部署方式
- 已按项目 NPM 发布流程执行：`release:version -> release:publish`。
- npm 发布使用项目根本地 `.npmrc` 作为 userconfig 注入到隔离 worktree 执行。
- git 发布闭环已完成：发布提交推送到 `master`，关键版本 tag 已推送到远端。

## 用户 / 产品视角的验收步骤
- 在 npm 上确认 `@nextclaw/ui@0.7.0`、`@nextclaw/core@0.8.0`、`@nextclaw/server@0.7.0`、`nextclaw@0.10.0` 可见。
- 在 git 远端确认 `master` 已包含发布提交，且关键 tags 可见。
- 对 `@nextclaw/agent-chat-ui`，确认包访问状态为 `public`；若 npm 页面检索存在短暂延迟，以 registry 同步完成后的可见结果为准。
