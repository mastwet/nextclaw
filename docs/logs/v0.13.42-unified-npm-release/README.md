# v0.13.42-unified-npm-release

## 迭代完成说明（改了什么）

- 对累积未发布改动执行一次统一 NPM 发布闭环。
- 使用 changeset 对本轮受影响公开包统一升补丁版本，并生成对应 changelog。
- 同步纳入 `nextclaw` 的 `ui-dist` 构建产物变更，保证发布包内资源与当前代码一致。
- 修复发布校验中的构建阻塞：为 `workers/marketplace-api` 的 D1 数据源子类补充公开构造函数，解除 TypeScript 编译错误。

## 测试/验证/验收方式

- 发布前版本生成：`pnpm release:version`（已通过）
- 发布前校验（由发布脚本内置执行）：`pnpm release:check`（`build` + `lint` + `tsc`，已通过）
- 发布执行：`pnpm release:publish`（已成功）
- 发布后线上版本回查（`npm view`）：
  - `nextclaw@0.9.21`
  - `@nextclaw/core@0.7.4`
  - `@nextclaw/ui@0.6.11`
  - `@nextclaw/server@0.6.8`
  - `@nextclaw/runtime@0.1.3`
  - `@nextclaw/channel-runtime@0.1.32`
  - `@nextclaw/nextclaw-engine-codex-sdk@0.2.1`
  - `@nextclaw/nextclaw-engine-claude-agent-sdk@0.2.1`
  - `@nextclaw/channel-plugin-dingtalk@0.1.8`
  - `@nextclaw/channel-plugin-discord@0.1.9`
  - `@nextclaw/channel-plugin-email@0.1.8`
  - `@nextclaw/channel-plugin-feishu@0.1.8`
  - `@nextclaw/channel-plugin-mochat@0.1.8`
  - `@nextclaw/channel-plugin-qq@0.1.8`
  - `@nextclaw/channel-plugin-slack@0.1.8`
  - `@nextclaw/channel-plugin-telegram@0.1.8`
  - `@nextclaw/channel-plugin-wecom@0.1.8`
  - `@nextclaw/channel-plugin-whatsapp@0.1.8`
  - `@nextclaw/openclaw-compat@0.2.3`
  - `@nextclaw/agent-chat` 当前 `npm view` 仍返回 404，已记录待继续核验（changeset 发布阶段输出为成功）。
- CLI 冒烟（非仓库目录）：
  - 命令：`cd /tmp && npx -y nextclaw@0.9.21 --version`
  - 结果：输出 `0.9.21`

## 发布/部署方式

- 按项目约定流程执行：
  - `pnpm release:version`
  - `pnpm release:publish`
- 本次为 NPM 包统一发布，不涉及后端部署与数据库 migration。
- 发布命令已完成并生成对应版本 tags（changeset tag）。

## 用户/产品视角的验收步骤

- 在新环境安装/升级：
  - `npm i -g nextclaw@latest`
- 验证 CLI 版本可用：
  - `nextclaw --version`
- 进入聊天页面验证关键体验：
  - 点击“停止”后任务应快速进入终止态，且停止后不再继续工具调用。
  - 会话列表状态应与当前会话终止状态一致。
  - 在消息列表底部（10px 阈值内）流式输出时应自动粘底滚动；手动上滚超过阈值后应解除粘底。
