# v0.14.304-chat-model-picker-recents

## 迭代完成说明

- 优化前端会话底部输入区的模型下拉展示，模型项从“模型名 + provider 两行”改为单行 `provider/model` 展示，减少视觉噪音并保留区分度。
- 为聊天模型选择新增“最近选择”体验优化：
  - 使用可复用的 `RecentSelectionManager` 管理浏览器本地最近选择记录。
  - 当当前可选模型数量大于 `5` 时，在下拉顶部展示最近选择分组。
  - 最近选择最多保留 `3` 个，按最近使用顺序排列。
  - 仅展示仍然存在于当前模型列表中的项，失效模型不会回显。
- 扩展聊天输入栏底层 select 语义，支持 option group / label / separator，便于后续其它“最近选择”“推荐项”等类似场景复用。

## 测试/验证/验收方式

- 单测：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test -- --run src/lib/recent-selection.manager.test.ts src/components/chat/adapters/chat-input-bar.adapter.test.ts`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui test -- --run src/components/chat/ui/chat-input-bar/chat-input-bar.test.tsx`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui tsc`
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm build:ui`
- Lint / 治理：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-agent-chat-ui lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
- 结果摘要：
  - 本次相关测试、类型检查与前端构建通过。
  - `lint` 存在仓库内既有 warning，但无新增错误阻塞。
  - `lint:maintainability:guard` 通过，保留对 `packages/nextclaw-ui/src/lib` 与 `packages/nextclaw-ui/src/lib/i18n.ts` 的既有维护性 warning。

## 发布/部署方式

- 本次为前端 UI 行为优化，未在本迭代内直接执行正式发布。
- 如需构建前端产物，可执行：
  - `PATH=/opt/homebrew/bin:$PATH pnpm build:ui`
- 如需走项目既有前端发布闭环，可执行：
  - `PATH=/opt/homebrew/bin:$PATH pnpm release:frontend`

## 用户/产品视角的验收步骤

1. 打开聊天页，点击底部输入区的模型选择下拉。
2. 确认每个模型项为单行展示，不再出现第二行 provider 文案。
3. 在模型较多的场景下，连续切换多个不同模型。
4. 再次打开下拉，确认顶部出现“最近选择”分组，且顺序与最近使用顺序一致。
5. 确认最近选择最多显示 `3` 个，不会无限增长。
6. 刷新浏览器后再次打开下拉，确认最近选择仍然保留。
7. 当某个最近模型已不在当前可选模型列表中时，确认它不会继续出现在“最近选择”分组里。
