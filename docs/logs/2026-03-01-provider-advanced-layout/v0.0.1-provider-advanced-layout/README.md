# 2026-03-01 Provider Advanced Layout

## 背景 / 问题

- Provider 配置表单中，“名称（displayName）”被放进了高级设置，不符合实际使用频率。
- `Wire API Mode` 需要作为高级项收纳到高级设置中，避免常规区信息过载。

## 决策

- 自定义 Provider 的“名称”恢复到常规配置区域。
- `Wire API Mode` 从常规区迁入“高级设置”折叠区。
- 保持原有保存逻辑与字段语义不变，仅调整信息架构与展示位置。

## 变更内容（迭代完成说明）

- 用户可见变化：
  - 自定义 Provider 的名称编辑框回到主表单。
  - `Wire API Mode` 仅在展开“高级设置”后显示。
- 关键实现点：
  - `packages/nextclaw-ui/src/components/config/ProviderForm.tsx`

## 测试 / 验证 / 验收方式

```bash
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc
```

验收点：

- `build` 成功。
- `lint` 无 error（现有 max-lines 警告延续，不属于本次引入）。
- `tsc` 通过。

## 用户 / 产品视角验收步骤

1. 打开配置页并选择一个自定义 Provider。
2. 在主表单区域确认可直接看到“名称”输入框。
3. 展开“高级设置”，确认可看到 `Wire API Mode`。
4. 修改“名称”与 `Wire API Mode` 后保存，刷新页面确认配置持久化。

## 发布 / 部署方式

- 本次变更仅影响 `@nextclaw/ui`（以及携带 UI 产物的 `nextclaw`）。
- 按发布流程执行：`docs/workflows/npm-release-process.md`。

## 影响范围 / 风险

- Breaking change：否。
- 风险：低，仅表单布局调整。
