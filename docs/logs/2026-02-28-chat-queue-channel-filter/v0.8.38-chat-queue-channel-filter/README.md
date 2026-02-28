# v0.8.38-chat-queue-channel-filter

## 迭代完成说明（改了什么）

- Chat 发送交互对齐 openclaw：
  - AI 流式回复期间，输入框保持可编辑。
  - 忙时点击发送不阻塞，消息进入前端队列顺序发送（Queue）。
- 工具消息展示增强：
  - 工具调用结果后紧跟的 assistant 解释文本，合并到同一消息卡片展示，减少“工具卡 + 解释卡”割裂感。
- Chat 会话列表新增渠道过滤：
  - 复用会话管理同源规则，从 `sessionKey` 解析渠道并支持 `All + channel` 过滤。
- Chat 顶部 header 布局优化：
  - 改为更紧凑的网格布局，减少在常见宽度下换成 3 行的问题。

关键文件：

- `packages/nextclaw-ui/src/components/chat/ChatPage.tsx`
- `packages/nextclaw-ui/src/lib/chat-message.ts`
- `packages/nextclaw-ui/src/lib/i18n.ts`
- `docs/USAGE.md`

## 测试 / 验证 / 验收方式

已执行：

- 定向验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`
- 全量验证（发布链路内执行）：
  - `PATH=/opt/homebrew/bin:$PATH pnpm build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm tsc`
- 冒烟（非仓库目录，隔离 `NEXTCLAW_HOME`）：
  - 启动：`NEXTCLAW_HOME=/tmp/... node packages/nextclaw/dist/cli/index.js ui --port 18812 --no-open`
  - `GET /api/health` 返回 `{"ok":true,"data":{"status":"ok"}}`
  - `POST /api/chat/turn/stream` 可收到 `event: ready`，未配置 provider 时返回明确 `event: error`（预期）
- 归并逻辑冒烟：
  - 使用 `tsx` 执行 `combineToolCallAndResults` 样例，确认“tool result + 后续 assistant 文本”归并后仅 1 条消息。

## 发布 / 部署方式

按前端发布闭环执行：

1. `PATH=/opt/homebrew/bin:$PATH pnpm release:frontend`

本轮发布结果：

- `nextclaw@0.8.38`
- `@nextclaw/ui@0.5.26`

## 用户 / 产品视角的验收步骤

1. 启动：`nextclaw start`
2. 打开 UI：`http://127.0.0.1:18791`，进入 Chat 页面。
3. 发送一条会触发工具调用的问题，确认“工具结果 + 紧随解释”在同一卡片内展示。
4. 在 AI 还在回复时继续输入并点击发送，确认新消息进入队列并在当前回复结束后自动发送。
5. 在左侧会话列表切换渠道过滤，确认只展示对应渠道会话。
6. 观察顶部 header，确认在桌面常见宽度下保持紧凑（不出现 3 行堆叠）。
