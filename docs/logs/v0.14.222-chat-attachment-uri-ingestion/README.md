# v0.14.222 Chat Attachment URI Ingestion

## 迭代完成说明

- 为聊天附件建立本地附件存储与稳定 `attachmentUri` 流程：上传后服务端保存附件并返回 `attachmentUri + url`，前端不再把一般文件长期保存在 composer 的 base64 状态里。
- 新增 NCP 附件上传/内容访问接口：`POST /api/ncp/attachments`、`GET /api/ncp/attachments/content?uri=...`，主 UI 与 `apps/ncp-demo` 都已接入。
- 修复运行时只感知图片、不感知 `json/txt/md/csv/xml/源码` 等 text-like 文件的问题：`DefaultNcpContextBuilder` 与 NextClaw NCP 上下文链现在都会把这些附件注入模型上下文。
- 修复文件 tag 插入后光标回到前面的行为：在 composer 重新 focus 后下一帧恢复 selection，保证光标落在文件 token 后。
- 设计文档：
  - [Chat Attachment Service Design](/Users/peiwang/Projects/nextbot/docs/plans/2026-03-26-chat-attachment-service-design.md)

## 测试/验证/验收方式

- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ncp-agent-runtime tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --dir apps/ncp-demo tsc`
- 定向测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ncp-agent-runtime exec vitest run src/context-builder.test.ts src/attachment-store.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter nextclaw exec vitest run src/cli/commands/ncp/nextclaw-ncp-context-builder.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server exec vitest run src/ui/router.ncp-agent.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/ui exec vitest run src/components/chat/chat-composer-state.test.ts src/components/chat/adapters/chat-message.adapter.test.ts src/components/chat/ncp/ncp-session-adapter.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui exec vitest run src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`
- 冒烟说明：
  - `src/ui/router.ncp-agent.test.ts` 已覆盖真实上传路由与内容读取路径，验证上传 `config.json` 后返回 `attachmentUri`，并可通过内容接口取回原始文件。
  - `chat-input-bar.test.tsx` 已覆盖插入文件 token 后 selection 恢复到 token 后的位置。

## 发布/部署方式

- 本次为代码实现与验证，不涉及独立发布动作。
- 若需要对前端或 CLI 发版，按项目既有 release 流程执行；本次新增的附件目录默认位于 `NEXTCLAW_HOME` 对应数据目录下的 `attachments/`。

## 用户/产品视角的验收步骤

1. 在 NextClaw 聊天输入框中上传一个 `json` 或 `txt` 文件，确认输入框里出现文件 tag，且光标停在 tag 后面。
2. 直接发送仅包含该附件或“文本 + 附件”的消息，确认用户消息回显中能看到文件卡片/下载链接。
3. 观察 AI 回复，确认它已经能引用文件里的内容，而不是像之前一样忽略该 `json/txt` 文件。
4. 上传图片，确认现有图片预览与多模态能力没有回退。
5. 在 `apps/ncp-demo` 中重复上传 `json` 文件并发送，确认 demo 路径与主产品行为一致。
