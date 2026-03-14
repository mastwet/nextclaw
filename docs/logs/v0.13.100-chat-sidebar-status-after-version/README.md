# v0.13.100-chat-sidebar-status-after-version

## 迭代完成说明（改了什么）
- 调整状态点位置：从标题行右侧独立对齐，改为直接跟在版本号后面。
- 为 `BrandHeader` 增加 `suffix` 插槽能力，用于在品牌名/版本信息后附加轻量状态指示。
- `ChatSidebar` 改为通过 `BrandHeader` 的 `suffix` 传入 `StatusBadge`，实现更自然的同一行阅读顺序。

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
1. 打开聊天主界面。
2. 查看左侧顶部品牌区域，确认状态点紧跟在版本号后。
3. 确认不再右侧独立悬挂。
4. 悬停状态点，确认 Tooltip 文案仍可用且状态切换正常。
