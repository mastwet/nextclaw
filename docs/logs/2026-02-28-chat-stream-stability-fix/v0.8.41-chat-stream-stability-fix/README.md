# v0.8.41-chat-stream-stability-fix

## 迭代完成说明（改了什么）

- 修复 UI 新会话“消息被吞/回复空白”的根因：
  - `nextclaw` 流式转发逻辑此前在遇到首个非 `delta` 事件（常见是 `session_event`）时会提前结束生成器，导致后续终止事件被截断。
  - 现改为仅在 `final` 或 `error` 时结束流，`session_event` 将持续保序透传。
- 修复 Chat 页面历史加载与首条消息显示稳定性：
  - `useSessionHistory` 关闭重试，避免新建会话历史 404 时长时间 loading 覆盖实时流。
  - 新增 optimistic user event，确保新会话发送后本地立即可见，不等待服务端回写。
- 修复流式收尾 UI 抖动：
  - 增加 `isAwaitingAssistantOutput` 状态，typing 指示器仅在“等待首个 assistant 输出”阶段显示。
  - 消除“流结束瞬间闪一下 AI 正在回复”的视觉闪烁。

关键文件：

- `packages/nextclaw/src/cli/commands/service.ts`
- `packages/nextclaw-ui/src/components/chat/ChatPage.tsx`
- `packages/nextclaw-ui/src/hooks/useConfig.ts`

## 测试 / 验证 / 验收方式

已执行（定向）：

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server test src/ui/router.chat.test.ts`

冒烟（非仓库目录/隔离数据）：

- `NEXTCLAW_HOME=/tmp/nextclaw-smoke-xxxxxx`
- 启动：`pnpm -C packages/nextclaw dev:build serve --ui-port 19083`
- 请求：`POST /api/chat/turn/stream`
- 观察点：
  - 事件包含 `ready` + `session_event` + 终止事件（`final` 或 `error`）。
  - 不出现 `stream ended without a final result`（即不再被 `session_event` 截断）。
- 本次无 API key 场景下，终止事件为 `error`（预期），但链路完整。

## 发布 / 部署方式

按既有发布流程执行：

1. `PATH=/opt/homebrew/bin:$PATH pnpm release:version`
2. `PATH=/opt/homebrew/bin:$PATH pnpm release:publish`

本轮发布结果：

- `nextclaw@0.8.41`
- `@nextclaw/ui@0.5.29`

## 用户 / 产品视角的验收步骤

1. 启动 `nextclaw start`，进入 Chat 页面，点击“新建会话”。
2. 输入并发送首条消息，确认用户消息立即显示，不再出现“发送后空白”。
3. 观察流式回复：
   - `thinking/tool` 与正文按事件顺序持续出现。
   - 收尾时不再闪现“AI 正在回复”。
4. 在未配置 API key 时，确认会出现明确错误提示，而不是“消息吞掉/无终止”。
5. 配置 API key 后再测一轮，确认正常返回 `final` 并落盘可刷新复现。

## 文档影响检查

- 本次不新增命令入口，无需更新 `commands/commands.md`。
- 迭代日志已补充，满足发布追踪要求。
