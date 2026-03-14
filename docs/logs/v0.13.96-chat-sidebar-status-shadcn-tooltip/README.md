# v0.13.96-chat-sidebar-status-shadcn-tooltip

## 迭代完成说明（改了什么）
- 将侧边栏状态图标的提示方式从原生 `title` 改为 shadcn Tooltip。
- 复用 `@/components/ui/tooltip` 的 `TooltipProvider / Tooltip / TooltipTrigger / TooltipContent`。
- 保持现有图标三态与样式不变，仅替换提示交互实现。

## 测试/验证/验收方式
- `pnpm -C packages/nextclaw-ui tsc`（通过）
- `pnpm -C packages/nextclaw-ui build`（通过）
- 冒烟：
  - `pnpm -C packages/nextclaw-ui dev --host 127.0.0.1 --port 4174 --strictPort`
  - `curl http://127.0.0.1:4174/` 返回 `HTTP 200`（通过）

## 发布/部署方式
- 发布前执行：`pnpm -C packages/nextclaw-ui tsc && pnpm -C packages/nextclaw-ui build`
- 正式发布按项目既有 release/changeset 流程。
- 不适用项：远程 migration（未涉及数据库变更）。

## 用户/产品视角的验收步骤
1. 打开聊天主界面，定位左侧栏标题行右侧状态图标。
2. 鼠标悬停状态图标，确认出现 shadcn 风格 Tooltip。
3. 断网/恢复网络或重启后端，确认 Tooltip 文案随状态变化（已连接/连接中/未连接）。
