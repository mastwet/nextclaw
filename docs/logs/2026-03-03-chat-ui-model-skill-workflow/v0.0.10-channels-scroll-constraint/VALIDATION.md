# v0.0.10 Validation

## 执行命令

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`

## 结果

- `tsc`：通过。
- `build`：通过。

## 冒烟验证（UI）

1. 打开设置 -> `Channels`。
2. 选择 `Discord`（字段较多）。
3. 在右侧表单区域持续向下滚动到底，再继续滚轮。
4. 预期：滚动停留在渠道卡片内部；页面下方不再出现可持续下滚的大块空白。
5. 对照 `Providers` 页面，滚动行为保持一致且未回归。
