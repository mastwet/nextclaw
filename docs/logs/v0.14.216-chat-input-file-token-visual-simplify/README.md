# v0.14.216-chat-input-file-token-visual-simplify

## 迭代完成说明

- 优化主聊天输入框里的文件/图片附件 token 视觉样式，目标是更简约、更轻，不再像一个小卡片横幅。
- 移除文件 token 右侧的扩展名徽标（如 `PNG`），只保留图标和文件名，减少视觉噪音。
- 将文件 token 从高对比蓝色渐变胶囊调整为中性浅灰标签，同时缩小高度、圆角和整体宽度占用。
- 收敛文件图标容器尺寸与配色，弱化强调感，让输入区更像自然的内联内容。
- 更新输入栏测试，明确约束插入的文件 token 保留文件名、采用更轻量的圆角样式，并且不再显示 `PNG` 文案。

## 测试/验证/验收方式

- 单测：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui exec vitest run src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`
- 类型验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui tsc`
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui build`
- Lint 验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui lint`
  - 结果：通过；存在仓库既有 warning，位于 `packages/nextclaw-agent-chat-ui/src/components/chat/utils/copy-text.ts:22`，与本次改动无关。
- 可维护性自检：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-composer-surface-renderer.ts packages/nextclaw-agent-chat-ui/src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`

## 发布/部署方式

- 本次未执行正式发布。
- 若当前前端页面已在运行，需要等待热更新或重启前端进程后，输入框中的附件 token 才会体现新的简约样式。

## 用户/产品视角的验收步骤

1. 打开主聊天页面，在输入框中添加一张图片或文件。
2. 确认 token 只展示图标和文件名，不再显示右侧 `PNG` 之类的扩展名徽标。
3. 确认 token 整体更轻、更窄、更简约，不再像一个蓝色小横幅。
4. 确认插入 token 后，继续在其前后输入文本时，光标和文本流仍然正常。
