# v0.13.94-chat-sidebar-status-badge-inline-title

## 迭代完成说明（改了什么）
- 调整聊天主侧边栏状态徽标位置：从标题下方移动到标题同一行末尾，并保持右对齐。
- 具体实现为在标题区域使用 `flex + justify-between`，左侧 `BrandHeader`，右侧 `StatusBadge`。

## 测试/验证/验收方式
- 代码验证（UI 受影响最小充分验证）：
  - `pnpm -C packages/nextclaw-ui tsc`
  - `pnpm -C packages/nextclaw-ui build`
- 冒烟验证：
  - 启动 `pnpm -C packages/nextclaw-ui dev --host 127.0.0.1 --port 4174 --strictPort`
  - 打开主页观察左侧标题行：状态徽标与标题同一行，位于最右侧。

## 发布/部署方式
- UI 变更发布前执行：
  - `pnpm -C packages/nextclaw-ui tsc && pnpm -C packages/nextclaw-ui build`
- 正式发布按项目既有流程执行（changeset/release 流程）。
- 不适用项：
  - 远程 migration 不适用（未涉及后端数据库变更）。

## 用户/产品视角的验收步骤
1. 打开聊天主界面。
2. 查看左侧栏顶部标题区域（品牌名与版本号所在行）。
3. 确认状态徽标在同一行最右侧，视觉上不再“掉到下一行”。
4. 在连接状态变化时，徽标文案和颜色仍正常更新。
