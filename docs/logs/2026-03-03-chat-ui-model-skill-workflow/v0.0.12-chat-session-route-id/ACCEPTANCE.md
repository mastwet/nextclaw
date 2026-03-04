# v0.0.12 User Acceptance

## 用户/产品视角验收步骤

1. 打开 `/chat`：应显示新会话视图。
2. 从会话列表点击一个旧会话：应进入 `/chat/:sessionKey` 且加载该会话。
3. 在新会话视图发送一条消息：URL 应从 `/chat` 变为 `/chat/:sessionKey`。
4. 点击“新任务”：应返回 `/chat`，不携带会话 id。
5. 删除当前会话后：应回到 `/chat`。
