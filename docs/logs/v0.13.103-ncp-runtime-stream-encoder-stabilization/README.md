# v0.13.103-ncp-runtime-stream-encoder-stabilization

## 迭代完成说明（改了什么）
- 将 `@nextclaw/ncp-agent-runtime` 的流编码逻辑从 [`stream-encoder.ts`](../../../packages/nextclaw-ncp-agent-runtime/src/stream-encoder.ts) 拆分到 [`stream-encoder.utils.ts`](../../../packages/nextclaw-ncp-agent-runtime/src/stream-encoder.utils.ts)，把文本增量、reasoning 增量、tool call 增量和收尾刷出逻辑独立出来，降低主编码器复杂度。
- 保持 NCP 事件语义不变：
  - 文本首包时发出 `message.text.start`
  - reasoning 按 chunk 持续发出 `message.reasoning.delta`
  - tool call 在拿到 `id + name` 后发出 `message.tool-call-start`，结束时统一刷出 `message.tool-call-args` 与 `message.tool-call-end`
- 调整 [`runtime.ts`](../../../packages/nextclaw-ncp-agent-runtime/src/runtime.ts)：用户输入消息仍会写入状态管理器，但不再从 `run()` 额外向外层重复 `yield message.sent`，避免上层消费链路收到重复发送事件。
- 相关联提交同时纳入已有迭代日志：
  - [v0.13.92-ncp-smoke-workflow-and-local-verification](../v0.13.92-ncp-smoke-workflow-and-local-verification/README.md)
  - [v0.13.93-ui-backend-health-status-visibility](../v0.13.93-ui-backend-health-status-visibility/README.md)
  - [v0.13.100-chat-sidebar-status-after-version](../v0.13.100-chat-sidebar-status-after-version/README.md)
  - [v0.13.101-status-initial-fast-settle](../v0.13.101-status-initial-fast-settle/README.md)

## 测试/验证/验收方式
- 受影响包最小充分验证：
  - `pnpm -C packages/nextclaw-ncp-agent-runtime lint`
  - `pnpm -C packages/nextclaw-ncp-agent-runtime tsc`
  - `pnpm -C packages/nextclaw-ncp-agent-runtime build`
  - `pnpm -C packages/nextclaw-ui tsc`
  - `pnpm -C packages/nextclaw-ui build`
  - `pnpm -C packages/nextclaw-server lint`
  - `pnpm -C packages/nextclaw-server tsc`
  - `pnpm -C packages/nextclaw-server build`
- 冒烟验证：
  - 执行 NCP 相关最小链路，确认流式响应仍按 `run.started -> message.* -> run.finished` 顺序输出。
  - 刷新聊天页面，确认顶部状态点能快速收敛到 `connected` 或 `disconnected`。

## 发布/部署方式
- 本次改动涉及 `@nextclaw/ncp-agent-runtime`、`@nextclaw/ui`、`@nextclaw/server`。
- 发布前执行对应包的 `lint`/`tsc`/`build`，再按仓库既有 release 流程进行版本与发布。
- 不适用项：
  - 远程 migration 不适用（未涉及数据库 schema 或后端持久化变更）。

## 用户/产品视角的验收步骤
1. 启动包含 NCP 运行时的聊天链路并发起一次对话。
2. 确认首条用户消息不会在会话流里重复出现两次发送事件。
3. 若模型返回 tool call，确认工具调用开始、参数、结果与结束顺序正常。
4. 打开聊天主界面，确认版本号后的状态点能在页面加载后快速稳定，并在服务断开时切换为断开态。
