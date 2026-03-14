# v0.13.101-status-initial-fast-settle

## 迭代完成说明（改了什么）
- 修正页面 reload 后状态点长时间停留在 `connecting` 的问题。
- 状态策略调整为：
  - WebSocket 已连接：`connected`
  - WebSocket 未连接但 `/api/health` 可达：`connected`
  - `/api/health` 不可达：`disconnected`
- 在 WebSocket 启动后立刻触发一次健康探测，避免等待下一次定时检查导致的视觉延迟。

## 测试/验证/验收方式
- `pnpm -C packages/nextclaw-ui tsc`（通过）
- `pnpm -C packages/nextclaw-ui build`（通过）
- 冒烟：
  - `pnpm -C packages/nextclaw-ui dev --host 127.0.0.1 --port 4174 --strictPort`
  - `curl http://127.0.0.1:4174/` 返回 `HTTP 200`（通过）

## 发布/部署方式
- 发布前执行：`pnpm -C packages/nextclaw-ui tsc && pnpm -C packages/nextclaw-ui build`
- 正式发布按仓库既有 release/changeset 流程。
- 不适用项：远程 migration（未涉及数据库变更）。

## 用户/产品视角的验收步骤
1. 刷新聊天页面。
2. 观察状态点应在短时间内从初始化态收敛为绿色（后端可用时）。
3. 当后端真正不可达时，状态点应显示断开态。
