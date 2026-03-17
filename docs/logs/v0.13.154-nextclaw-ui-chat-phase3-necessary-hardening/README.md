# v0.13.154-nextclaw-ui-chat-phase3-necessary-hardening

## 迭代完成说明（改了什么）
- 将 chat 模块公共出口收敛为“可复用层”，`packages/nextclaw-ui/src/components/chat/index.ts` 不再导出 Nextclaw 宿主 `containers` 与宿主 adapters。
- 新增 `packages/nextclaw-ui/src/components/chat/nextclaw/index.ts`，承接 Nextclaw 宿主层导出，明确复用层与宿主层边界。
- `ChatConversationPanel` 改为从 `chat/nextclaw` 入口消费容器层能力，不再通过复用层入口反向耦合。
- `chat-ui-primitives.tsx` 新增 `Input` 适配，chat 默认皮肤对 `Input/Popover/Select/Tooltip` 的依赖统一经过 chat primitive 层。
- `chat-input-bar-skill-picker.tsx` 补充基础键盘导航与最小 ARIA 语义：
  - 搜索输入支持上下键切换激活项与 Enter 选择
  - 列表提供 `listbox/option` 语义
  - 激活项自动滚动可见
- `chat-slash-menu.tsx` 补充 `listbox/option` 语义，与当前 slash 激活模型保持一致。
- 新增 Phase 3 计划文件：`docs/plans/2026-03-17-nextclaw-ui-chat-phase3-plan.md`

## 测试/验证/验收方式
- `pnpm -C packages/nextclaw-ui tsc`
- `pnpm -C packages/nextclaw-ui test src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx src/components/chat/ui/chat-input-bar/chat-slash-menu.test.tsx src/components/chat/ui/chat-message-list/chat-message-list.test.tsx`
- `pnpm -C packages/nextclaw-ui build`
- `pnpm -C packages/nextclaw-ui exec eslint src/components/chat/ChatConversationPanel.tsx src/components/chat/index.ts src/components/chat/nextclaw src/components/chat/ui/primitives/chat-ui-primitives.tsx src/components/chat/ui/chat-input-bar/chat-input-bar-skill-picker.tsx src/components/chat/ui/chat-input-bar/chat-slash-menu.tsx src/components/chat/ui/chat-input-bar/chat-slash-menu.test.tsx`

## 发布/部署方式
- 本迭代仅涉及 `nextclaw-ui` chat 结构硬化与交互语义补齐，不涉及协议、服务端或 migration。
- 按现有前端发布流程随主线发布即可。

## 用户/产品视角的验收步骤
1. 打开 Chat 页面，确认主会话区和输入区视觉与主行为无明显回归。
2. 输入 `/` 打开 slash 菜单，确认仍可上下键切换并回车选择。
3. 打开 skill picker，在搜索框中使用上下键和 Enter，确认可切换与选择技能。
4. 检查代码块复制、消息列表渲染和发送区交互均保持正常。
