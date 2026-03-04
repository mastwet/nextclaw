# v0.0.11 Route Decouple + Session Navigation Fix

## 迭代完成说明

- 将主界面三块入口改为并列路由：`/chat`、`/skills`、`/cron`，移除 `skills/cron` 作为 `/chat` 子路由的设计。
- 保留兼容跳转：
  - `/chat/skills` -> `/skills`
  - `/chat/cron` -> `/cron`
  - `/chat/*` 其它路径 -> `/chat`
- 修复主界面会话点击无效：在 `skills/cron` 页点击会话时，先切回 `/chat` 再展示对应会话。
- 修复“新任务”在 `skills/cron` 页点击无效：创建新会话后自动回到 `/chat`。
- 主壳判定更新：`/chat`、`/skills`、`/cron` 都归属主界面壳，避免误落入设置壳。

涉及文件：

- `packages/nextclaw-ui/src/App.tsx`
- `packages/nextclaw-ui/src/components/chat/ChatPage.tsx`
- `packages/nextclaw-ui/src/components/chat/ChatSidebar.tsx`
- `packages/nextclaw-ui/src/components/layout/AppLayout.tsx`
