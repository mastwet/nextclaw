# v0.13.99-chat-sidebar-status-icon-only-mini

## 迭代完成说明（改了什么）
- 将侧边栏状态提示进一步轻量化为“仅图标/状态点”的最小尺寸展示。
- 去掉原先偏按钮感的圆形背景容器，仅保留小尺寸状态指示：
  - `connected`：绿色小实心点
  - `connecting`：小型旋转指示
  - `disconnected`：灰色小空心点
- 继续保留 shadcn Tooltip 作为状态文案提示（悬停可见）。

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
1. 打开聊天主界面，定位左侧标题行右侧状态图标。
2. 确认图标尺寸更小、无按钮底色，仅保留状态指示本体。
3. 悬停图标，确认 Tooltip 仍显示状态文案。
4. 在后端断开/恢复时，确认状态指示仍能正确变化。
