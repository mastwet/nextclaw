# v0.14.176-sidebar-item-reuse-hover-align

## 迭代完成说明

- 把主界面左侧边栏中已经验证稳定的 item 结构抽成共享组件，新增：
  - [`packages/nextclaw-ui/src/components/layout/sidebar-items.tsx`](../../../packages/nextclaw-ui/src/components/layout/sidebar-items.tsx)
- 共享组件覆盖三类左栏条目：
  - 导航链接项 `SidebarNavLinkItem`
  - 操作按钮项 `SidebarActionItem`
  - 选择器项 `SidebarSelectItem`
- 主界面左侧边栏已切换为复用这套共享组件：
  - 顶部导航项如“定时任务 / 技能”
  - 底部工具项如“设置 / 帮助文档 / 主题 / 语言”
- 设置界面左侧边栏也已复用同一套共享组件：
  - 中间设置导航项
  - 底部账号入口 / 帮助文档 / 主题 / 语言
- 设置页最顶部头部仍保持独立结构，没有被并入共享 item 抽象。
- 统一了 hover 反馈 token，避免出现不同区域混用不同背景反馈的问题：
  - 共享 sidebar item 统一使用 `hover:bg-gray-200/60`
  - 设置页顶部“返回主界面”入口也同步对齐到同一 hover 背景反馈
- 回归测试同步更新，确保设置页顶部结构保持原样，同时底部工具项继续保持 compact 且 hover token 一致：
  - [`packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx`](../../../packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx)
  - [`packages/nextclaw-ui/src/components/chat/ChatSidebar.test.tsx`](../../../packages/nextclaw-ui/src/components/chat/ChatSidebar.test.tsx)

## 测试 / 验证 / 验收方式

- 定向单测：
  - `pnpm --filter @nextclaw/ui test -- src/components/layout/sidebar.layout.test.tsx src/components/chat/ChatSidebar.test.tsx`
- 定向 lint：
  - `pnpm exec eslint packages/nextclaw-ui/src/components/layout/sidebar-items.tsx packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/chat/ChatSidebar.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx packages/nextclaw-ui/src/components/chat/ChatSidebar.test.tsx`
- 类型检查：
  - `pnpm --filter @nextclaw/ui tsc`
- 构建验证：
  - `pnpm --filter @nextclaw/ui build`
- UI 冒烟（服务级）：
  - `pnpm --filter @nextclaw/ui preview -- --host 127.0.0.1 --port 4173 --strictPort`
  - `curl -I http://127.0.0.1:4173/`
  - `curl -I http://127.0.0.1:4173/model`
- 可维护性自检：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/src/components/layout/sidebar-items.tsx packages/nextclaw-ui/src/components/layout/Sidebar.tsx packages/nextclaw-ui/src/components/chat/ChatSidebar.tsx packages/nextclaw-ui/src/components/layout/sidebar.layout.test.tsx packages/nextclaw-ui/src/components/chat/ChatSidebar.test.tsx`

## 发布 / 部署方式

- 本次为前端 UI 结构复用与交互一致性优化，无需数据库 migration 或后端发布。
- 按现有前端 / 桌面应用正常发布流程携带最新前端构建产物发布即可。

## 用户 / 产品视角的验收步骤

1. 打开主界面左侧边栏，观察“定时任务 / 技能”和底部“设置 / 帮助文档 / 主题 / 语言”。
2. 鼠标悬停这些条目，确认 hover 背景反馈一致，不再出现深浅或色值不统一的情况。
3. 进入设置界面，观察左侧设置导航与底部工具项，确认它们和主界面侧栏使用同一套 item 风格与 hover 反馈。
4. 鼠标悬停设置页顶部“返回主界面”，确认 hover 背景反馈也与侧栏其余 item 对齐。
5. 确认设置页最顶部结构本身没有被替换成别的样式，只是交互反馈和下面 item 的规范统一了。
