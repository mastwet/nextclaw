# 迭代完成说明

- 调整 `packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx`，聊天线程快照不再在每次流式更新时全量构造临时 `UiMessage[]`，改为直接透传原始 `NcpMessage[]`。
- 调整 `packages/nextclaw-ui/src/components/chat/containers/chat-message-list.container.tsx`，消息视图模型缓存改为绑定原始 `NcpMessage` 对象，历史消息在源对象未变化时复用既有适配结果，只让流式中的那条消息重新适配。
- 同步更新聊天线程 store、会话面板和受影响测试，保证新的消息源类型贯通到 UI 渲染层。

# 测试/验证/验收方式

- 运行受影响测试：

```bash
pnpm --filter @nextclaw/ui exec vitest run src/components/chat/ChatConversationPanel.test.tsx src/components/chat/containers/chat-message-list.container.test.tsx
```

- 运行受影响包类型检查：

```bash
pnpm --filter @nextclaw/ui exec tsc --noEmit
```

- 运行改后可维护性自检：

```bash
node .agents/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/src/components/chat/stores/chat-thread.store.ts packages/nextclaw-ui/src/components/chat/ChatConversationPanel.tsx packages/nextclaw-ui/src/components/chat/ncp/NcpChatPage.tsx packages/nextclaw-ui/src/components/chat/containers/chat-message-list.container.tsx packages/nextclaw-ui/src/components/chat/ChatConversationPanel.test.tsx packages/nextclaw-ui/src/components/chat/containers/chat-message-list.container.test.tsx
```

- 结果预期：
  - 受影响测试通过
  - `@nextclaw/ui` 类型检查通过
  - maintainability guard 无阻塞项；聊天目录存在已记录豁免的目录级告警，但本次未继续恶化

# 发布/部署方式

- 本次仅包含前端聊天渲染层代码调整，按常规前端发布流程重新构建并发布 UI 即可。
- 若随版本发布，遵循项目既有发布流程，在发布前执行本 README 中的验证命令。
- 本次不涉及后端 schema、migration 或额外部署步骤。

# 用户/产品视角的验收步骤

1. 打开 `nextclaw ui` 聊天页面，进入一个历史消息较多的 AI 会话。
2. 发送一条能触发较长流式输出的消息，观察输出过程。
3. 确认历史消息区域不会随着新 token 持续出现明显卡顿、闪动或整体重绘感。
4. 在同一会话中继续多轮发送，确认仅最新流式消息持续更新，旧消息展示稳定。
