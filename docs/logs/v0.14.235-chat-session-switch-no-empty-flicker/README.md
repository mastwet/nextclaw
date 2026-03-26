# v0.14.235-chat-session-switch-no-empty-flicker

## 迭代完成说明

- 修复前端聊天会话切换时的瞬时空态误判。
- 根因在于 `useHydratedNcpAgent` 切换 `sessionId` 的首个 render 中，`isHydrating` 仍可能沿用上一会话的已完成状态，导致聊天面板短暂进入“暂无消息，发送一条开始对话。”分支。
- 本次为 hook 增加“当前 hydration 是否已属于当前 session”的判定：只要已完成 hydration 的 session 还不是当前 session，就继续视为 hydrating，避免切换瞬间闪出空态文案。
- 新增回归测试，覆盖“会话 A 已加载完成后切到会话 B，首个 rerender 必须立刻进入 hydrating”这一场景。

## 测试/验证/验收方式

- `pnpm -C packages/nextclaw-ui test -- src/components/chat/useHydratedNcpAgent.test.tsx`
- `pnpm -C packages/nextclaw-ui tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-react tsc`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-react build`
- `pnpm -C packages/ncp-packages/nextclaw-ncp-react lint`
- `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/ncp-packages/nextclaw-ncp-react/src/hooks/use-hydrated-ncp-agent.ts packages/nextclaw-ui/src/components/chat/useHydratedNcpAgent.test.tsx`
- 验收关注点：
  - 已有消息的会话之间切换时，不应先闪出“暂无消息”文案。
  - 空会话在真正完成 hydration 后，仍可按原逻辑显示空态。
  - 首次加载与同会话 reload 仍保持原有 hydrating 行为。

## 发布/部署方式

- 本次未单独执行发布。
- 随下一次正常前端发布链路带出即可，无需数据库 migration、后端部署或额外运维动作。
- 若单独验证该修复，可按常规前端流程重新构建并发布 `@nextclaw/ui` 所在产物。

## 用户/产品视角的验收步骤

1. 打开聊天页面，并确保侧栏里至少有两个已有会话。
2. 点击会话 A，确认消息列表正常显示。
3. 立即切换到会话 B。
4. 观察主聊天区：切换过程中不应先闪现“暂无消息，发送一条开始对话。”。
5. 若切到一个真正空白的新会话，应只在加载稳定后看到空态，而不是切换瞬间误闪。
