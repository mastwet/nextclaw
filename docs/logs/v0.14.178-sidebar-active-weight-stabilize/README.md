# v0.14.178-sidebar-active-weight-stabilize

## 迭代完成说明

- 修复左侧边栏 item 在点击选中时文字权重出现“先加重、再回落”的不自然反馈。
- 根因是共享侧边栏导航项在选中态使用了 `font-semibold`，同时整行还使用了 `transition-all`，导致选中切换时视觉上出现不稳定的字重变化。
- 本次采用最小修复：
  - 移除选中态的 `font-semibold`，统一保持稳定字重。
  - 将导航项过渡从 `transition-all` 收敛为 `transition-colors`，避免不必要的全属性过渡。
- 这样选中态仍保留背景色、文字颜色和图标颜色的明确反馈，但不再产生奇怪的字重跳变。
- 同步补充回归断言，确保当前页侧边栏项不再携带 `font-semibold`：
  - [`packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx`](../../../packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx)

## 测试 / 验证 / 验收方式

- 定向单测：
  - `pnpm --filter @nextclaw/ui test -- src/components/layout/sidebar.layout.test.tsx src/components/chat/ChatSidebar.test.tsx`
- 定向 lint：
  - `pnpm exec eslint packages/nextclaw-ui/src/components/layout/sidebar-items.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/chat/ChatSidebar.tsx packages/nextclaw-ui/src/components/chat/ChatSidebar.test.tsx`
- 类型检查：
  - `pnpm --filter @nextclaw/ui tsc`
- 构建验证：
  - `pnpm --filter @nextclaw/ui build`
- UI 冒烟（服务级）：
  - `pnpm --filter @nextclaw/ui preview -- --host 127.0.0.1 --port 4173 --strictPort`
  - `curl -I http://127.0.0.1:4173/`
  - `curl -I http://127.0.0.1:4173/model`
- 可维护性自检：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/src/components/layout/sidebar-items.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/chat/ChatSidebar.tsx packages/nextclaw-ui/src/components/chat/ChatSidebar.test.tsx`

## 发布 / 部署方式

- 本次为前端交互体验微调，无需数据库 migration 或后端发布。
- 按现有前端 / 桌面应用正常发布流程携带最新前端构建产物发布即可。

## 用户 / 产品视角的验收步骤

1. 打开主界面或设置界面的左侧边栏。
2. 点击任意一个侧边栏 item，使其进入选中态。
3. 观察文字变化，确认不再出现“先变重、再变回去”的字重跳动。
4. 确认选中态仍然有明确的背景色和文字颜色反馈，但整体观感更稳定、更干净。
