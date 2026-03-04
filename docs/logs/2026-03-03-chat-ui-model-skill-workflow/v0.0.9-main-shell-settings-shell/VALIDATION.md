# v0.0.9 Validation

## 执行命令

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`

## 结果

- TypeScript 编译通过。
- UI 构建通过。

## 冒烟验证

1. 进入 `/chat`，确认会话列表（搜索/分组/切换）行为与之前一致。
2. Chat 侧栏底部可见 `设置` 入口，点击进入设置壳。
3. 设置壳左侧边栏 Header 可见“返回主界面（箭头+文字）”与“设置”标题。
4. Chat 侧栏点击 `Skills` 与 `Cron` 时，右侧内容区切换为对应页面（不离开主界面壳）。
5. `Sessions` 不再作为主界面快捷入口显示。
