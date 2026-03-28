# v0.14.261-frontend-republish-release

## 迭代完成说明

- 重新执行前端发布闭环，补发此前未进入 npm 已发布产物的前端相关包。
- 为通过仓库 release guard，将本次发布批次补齐为：
  - `@nextclaw/ui@0.11.5`
  - `nextclaw@0.16.6`
  - `@nextclaw/agent-chat-ui@0.2.9`
  - `@nextclaw/nextclaw-engine-claude-agent-sdk@0.3.8`
  - `@nextclaw/nextclaw-engine-codex-sdk@0.3.6`
  - `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk@0.1.27`
- 修复 [`packages/nextclaw-ui/src/App.test.tsx`](../../../packages/nextclaw-ui/src/App.test.tsx) 中未使用的 `userEvent` 导入，解除 `release:check:frontend` 的 lint 阻塞。

## 测试/验证/验收方式

- 前端发布链校验：
  - `NPM_CONFIG_USERCONFIG=/Users/tongwenwen/Projects/Peiiii/nextclaw/.npmrc pnpm release:publish:frontend`
- 扩展包定向校验：
  - `pnpm -C packages/extensions/nextclaw-engine-plugin-codex-sdk build && pnpm -C packages/extensions/nextclaw-engine-plugin-codex-sdk lint && pnpm -C packages/extensions/nextclaw-engine-plugin-codex-sdk tsc`
  - `pnpm -C packages/extensions/nextclaw-engine-plugin-claude-agent-sdk build && pnpm -C packages/extensions/nextclaw-engine-plugin-claude-agent-sdk lint && pnpm -C packages/extensions/nextclaw-engine-plugin-claude-agent-sdk tsc`
  - `pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk build && pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk lint && pnpm -C packages/extensions/nextclaw-ncp-runtime-plugin-claude-code-sdk tsc`
- 发布后冒烟：
  - 在仓库外临时目录执行 `npm pack nextclaw@0.16.6`，确认 tarball 包含 `ui-dist/index.html`、`ui-dist/assets/ChatPage-_RQ-15hd.js`、`ui-dist/assets/index-DOioYtlD.js`、`ui-dist/assets/vendor-waGu-koL.js`
  - 在仓库外临时目录执行 `npm_config_cache=<tmp> npx -y nextclaw@0.16.6 --version`，返回 `0.16.6`
- 可维护性自检：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/src/App.test.tsx`

## 发布/部署方式

- 已执行：
  - `NPM_CONFIG_USERCONFIG=/Users/tongwenwen/Projects/Peiiii/nextclaw/.npmrc pnpm release:version`
  - `NPM_CONFIG_USERCONFIG=/Users/tongwenwen/Projects/Peiiii/nextclaw/.npmrc pnpm release:publish:frontend`
- 发布结果：
  - `@nextclaw/ui@0.11.5`
  - `nextclaw@0.16.6`
  - `@nextclaw/agent-chat-ui@0.2.9`
  - `@nextclaw/nextclaw-engine-claude-agent-sdk@0.3.8`
  - `@nextclaw/nextclaw-engine-codex-sdk@0.3.6`
  - `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk@0.1.27`
- `changeset publish` 与 `changeset tag` 均已完成，已创建对应 git tags。

## 用户/产品视角的验收步骤

1. 执行 `npx -y nextclaw@0.16.6 --version`，确认能正常安装并返回 `0.16.6`。
2. 执行 `npm pack nextclaw@0.16.6` 并解包/查看 tarball，确认 `ui-dist` 目录存在且包含最新前端资源文件。
3. 用刚发布的 `nextclaw@0.16.6` 启动本地 UI 服务，打开聊天页，确认附件卡片/工具状态等最近前端改动已出现在页面中。
