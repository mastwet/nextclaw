# v0.13.95-chat-sidebar-status-icon-tooltip

## 迭代完成说明（改了什么）
- 将聊天主侧边栏顶部的连接状态展示从“文字徽标”改为“图标徽标”。
- 保留三态语义：
  - `connected`：`Wifi` 图标
  - `connecting`：`Loader` 旋转图标
  - `disconnected`：`WifiOff` 图标
- 增加 tooltip 能力：通过 `title` 与 `aria-label` 展示对应状态文案（已连接/连接中/未连接）。

## 测试/验证/验收方式
- 代码验证（受影响最小充分验证）：
  - `pnpm -C packages/nextclaw-ui tsc`（通过）
  - `pnpm -C packages/nextclaw-ui build`（通过）
- 冒烟验证：
  - 启动 `pnpm -C packages/nextclaw-ui dev --host 127.0.0.1 --port 4174 --strictPort`
  - 请求首页 `curl http://127.0.0.1:4174/` 返回 `HTTP 200`（通过）

## 发布/部署方式
- 本次为 UI 变更，发布前执行：
  - `pnpm -C packages/nextclaw-ui tsc && pnpm -C packages/nextclaw-ui build`
- 如需发版，按仓库既有 release/changeset 流程执行。
- 不适用项：
  - 远程 migration（未涉及后端数据库）。

## 用户/产品视角的验收步骤
1. 打开聊天主界面，查看左侧栏标题行最右侧状态徽标。
2. 确认仅显示图标，不再显示常驻文字。
3. 鼠标悬停图标，确认 tooltip 展示状态文案（已连接/连接中/未连接）。
4. 人为断开/恢复后端连接，确认图标与 tooltip 文案随状态变化。
