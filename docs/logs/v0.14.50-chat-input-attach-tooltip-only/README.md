# v0.14.50-chat-input-attach-tooltip-only

## 迭代完成说明

- 调整 chat 输入栏附件入口的展示方式：外层不再直接渲染“即将支持”文本，只保留附件图标。
- 附件入口的可访问名称改为“添加附件 / Attach file”，将“即将支持 / Coming soon”保留在 tooltip 中展示。
- 补齐禁用态 tooltip 的触发包装，避免 disabled button 无法稳定承载 tooltip 悬停触发。
- 新增组件测试，锁定“图标外显、文案不外显、禁用态仍保留 tooltip 触发包装”的回归行为。

## 测试 / 验证 / 验收方式

- 组件测试：
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui test -- --run src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`
- 类型检查：
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui tsc`
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ui tsc`
- Lint：
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui lint`
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/ui exec eslint src/components/chat/containers/chat-input-bar.container.tsx`
- 构建：
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH pnpm --filter @nextclaw/agent-chat-ui build`
- 可维护性自检：
  - `PATH=/opt/homebrew/bin:/Users/peiwang/.nvm/versions/node/v22.16.0/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar-toolbar.tsx packages/nextclaw-agent-chat-ui/src/components/chat/view-models/chat-ui.types.ts packages/nextclaw-ui/src/components/chat/containers/chat-input-bar.container.tsx packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`

## 发布 / 部署方式

- 本次为前端 UI 交互微调，无独立发布步骤。
- 若后续合并到正式发布流，按常规前端构建与发版流程带出即可；不涉及 migration、后端部署或额外运维操作。

## 用户 / 产品视角的验收步骤

1. 打开 chat 页面，定位到底部输入框工具条。
2. 观察附件入口，确认外侧不再直接显示“即将支持”文字，只展示附件图标。
3. 将鼠标悬停在附件图标附近，确认 tooltip 中展示“即将支持 / Coming soon”。
4. 确认发送按钮、模型选择、技能选择等相邻控件布局未被挤压或错位。
