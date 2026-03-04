# v0.0.12 Chat Session Route ID

## 迭代完成说明

- 会话页路由语义调整为：
  - `/chat/:sessionKey`：进入指定会话。
  - `/chat`：新会话界面（不自动选中历史会话）。
- 路由表新增 `path="/chat/:sessionKey"`，并保留历史兼容跳转：
  - `/chat/skills` -> `/skills`
  - `/chat/cron` -> `/cron`
- 会话交互联动路由：
  - 左侧点击会话：跳转到 `/chat/:sessionKey`。
  - 点击“新任务”：跳转到 `/chat`（新会话界面）。
  - 在 `/chat` 发送第一条消息时，自动生成会话 key，并更新到 `/chat/:sessionKey`。
- 删除会话后自动回到 `/chat`，避免停留在失效会话路径。

涉及文件：

- `packages/nextclaw-ui/src/App.tsx`
- `packages/nextclaw-ui/src/components/chat/ChatPage.tsx`
