# v0.14.226 Asset Store Unified

## 迭代完成说明

本次迭代把 NCP 聊天文件链路从 `attachment` 中心统一改为 `asset` 中心：

- 新增 `AssetStore` 本地实现 `LocalAssetStore`
- 核心能力统一为 `put / export / stat`
- 文件消息引用从 `attachmentUri` 统一改为 `assetUri`
- 删除运行时“自动把文件正文或图片内容塞进 prompt”的默认机制
- 用户消息中的文件现在只会生成轻量 asset 引用说明，并明确要求模型通过 `asset_export` 导出到普通路径后再处理
- 在 CLI/NCP 工具层新增 `asset_put`、`asset_export`、`asset_stat`
- 服务端上传/内容路由统一改为 `/api/ncp/assets` 与 `/api/ncp/assets/content`
- 前端上传返回 asset 引用，AI 工具返回 asset 时会直接渲染为图片/文件卡片

相关方案文档：

- [Asset Store Abstraction Design](/Users/peiwang/Projects/nextbot/docs/plans/2026-03-26-asset-store-abstraction-design.md)
- [Chat Attachment Service Design](/Users/peiwang/Projects/nextbot/docs/plans/2026-03-26-chat-attachment-service-design.md)

## 测试/验证/验收方式

已执行：

- `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime tsc`
- `pnpm -C packages/nextclaw-server tsc`
- `pnpm -C packages/nextclaw-ui tsc`
- `pnpm -C packages/nextclaw tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime test -- src/attachment-store.test.ts src/context-builder.test.ts`
- `pnpm -C packages/nextclaw-server test -- src/ui/router.ncp-agent.test.ts`
- `pnpm -C packages/nextclaw-ui test -- src/components/chat/adapters/chat-message.adapter.test.ts src/components/chat/chat-composer-state.test.ts`
- `pnpm -C packages/nextclaw test -- src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts src/cli/commands/service-deferred-ncp-agent.test.ts`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-agent-runtime build`
- `pnpm -C packages/nextclaw-server build`
- `pnpm -C packages/nextclaw-ui build`
- `pnpm -C packages/nextclaw build`
- `pnpm -C apps/ncp-demo build`
- `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw/src/cli/commands/service.ts packages/nextclaw/src/cli/commands/ncp/create-ui-ncp-agent.ts packages/nextclaw/src/cli/commands/ncp/nextclaw-ncp-context-builder.ts packages/nextclaw-server/src/ui/router/ncp-attachment.controller.ts packages/ncp-packages/nextclaw-ncp-agent-runtime/src/asset-store.ts packages/ncp-packages/nextclaw-ncp-agent-runtime/src/user-content.ts packages/nextclaw-ui/src/components/chat/adapters/chat-message.adapter.ts`

说明：

- `pnpm lint:maintainability:guard` 已执行，但失败原因是现有工作区中的 [service.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service.ts) 继续增长，属于当前工作区已存在的大文件维护性告警，并非本次 asset 链路本身的类型/构建失败。
- 针对本次真实触达文件重新执行了定向 maintainability guard，无阻塞项；其中 [service.ts](/Users/peiwang/Projects/nextbot/packages/nextclaw/src/cli/commands/service.ts) 仍超预算，但已从 `1218` 行下降到 `1061` 行，属于减债状态，后续仍应继续拆分。
- `apps/ncp-demo` 的在线 smoke 依赖 `OPENAI_API_KEY` 与 `OPENAI_BASE_URL`，当前环境未提供，因此未执行该外部依赖 smoke。

## 发布/部署方式

按仓库约定执行：

1. 创建 changeset
2. 执行 `pnpm release:version`
3. 执行 `pnpm release:publish`
4. 如需分发 CLI，则使用新产出的 `nextclaw` 包版本

本次已实际执行并完成：

- `NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:version`
- `NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:publish`

结果：

- npm 发布成功：`@nextclaw/ncp@0.4.0`、`@nextclaw/ncp-agent-runtime@0.3.0`、`@nextclaw/ncp-react@0.4.0`、`@nextclaw/server@0.11.0`、`@nextclaw/ui@0.11.0`、`nextclaw@0.16.0` 及其联动包
- 本地 git tags 已生成，对应本轮发布版本

## 用户/产品视角的验收步骤

1. 在聊天输入区上传一张图片或任意文件，确认消息 part 中保存的是 `assetUri` 而不是文件正文注入。
2. 让 AI 调用 `asset_export` 把该 asset 导出到普通路径，再通过普通文件工具处理它。
3. 让 AI 对处理后的产物调用 `asset_put`，确认聊天中直接显示新的图片或文件卡片，并可预览/下载。
4. 上传一个较大的文本或 PDF，确认模型上下文中不会再出现“默认注入前 32KB 正文”的行为。
