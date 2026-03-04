# v0.0.9 Main Shell + Settings Shell

## 迭代完成说明

- 主界面壳保留现有 Chat 体验，不改会话列表逻辑与交互。
- 将主界面能力聚焦为 `Chat + Skills + Cron`：
  - Chat 侧栏快捷入口保留 `Skills`、`Cron`，路由切到 `/chat/skills`、`/chat/cron`。
  - 从 Chat 侧栏移除 `Sessions` 主入口。
  - 点击 `Skills/Cron` 时，内容直接在主界面右侧区域切换展示，不再跳转到独立壳。
- 引入独立“设置”入口：
  - Chat 左侧栏底部增加 `设置` 入口（保持主界面结构不变）。
- 设置壳增强：
  - 新增 `/settings -> /model` 入口路由。
  - 设置界面左侧边栏 Header 增加“返回主界面（箭头+文字）”与“设置”标题/图标。
- 文案：新增 `settings`、`backToMain` i18n 键。
