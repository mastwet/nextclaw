# v0.13.97-chat-sidebar-status-dot-semantics

## 迭代完成说明（改了什么）
- 优化侧边栏常驻状态图标语义，移除易与网络信号混淆的 `Wifi/WifiOff` 图标。
- 新方案改为“服务状态点 + shadcn Tooltip”：
  - `connected`：绿色实心点
  - `connecting`：琥珀色旋转指示
  - `disconnected`：灰色空心点
- 保留 Tooltip 文案（已连接/连接中/未连接）和可访问性标签。

## 测试/验证/验收方式
- 代码验证：
  - `pnpm -C packages/nextclaw-ui tsc`（通过）
  - `pnpm -C packages/nextclaw-ui build`（通过）
- 冒烟验证：
  - `pnpm -C packages/nextclaw-ui dev --host 127.0.0.1 --port 4174 --strictPort`
  - `curl http://127.0.0.1:4174/` 返回 `HTTP 200`（通过）

## 发布/部署方式
- UI 变更发布前执行：
  - `pnpm -C packages/nextclaw-ui tsc && pnpm -C packages/nextclaw-ui build`
- 正式发布按仓库既有 release/changeset 流程。
- 不适用项：远程 migration（未涉及数据库变更）。

## 用户/产品视角的验收步骤
1. 打开聊天主界面，定位左侧标题行右侧状态图标。
2. 确认图标为状态点而非 WiFi 图标。
3. 悬停图标，确认 Tooltip 展示状态文案。
4. 在后端断开/恢复时，确认状态点形态与颜色随状态变化。
