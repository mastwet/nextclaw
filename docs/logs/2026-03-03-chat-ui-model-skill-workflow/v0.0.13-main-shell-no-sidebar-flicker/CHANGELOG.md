# v0.0.13 Main Shell No Sidebar Flicker

## 迭代完成说明

- 修复主界面在切换页面（`/chat`、`/skills`、`/cron`）时整页闪烁/抖动问题。
- 根因：`App.tsx` 在路由容器使用了 `key={location.pathname}` + `animate-fade-in`，导致每次路由切换都会重挂载整棵主界面（包含左侧边栏）。
- 修复：移除该层的强制重挂载与全局淡入动画，仅保留正常路由内容更新，不再让左侧边栏参与切页动画。

涉及文件：

- `packages/nextclaw-ui/src/App.tsx`
