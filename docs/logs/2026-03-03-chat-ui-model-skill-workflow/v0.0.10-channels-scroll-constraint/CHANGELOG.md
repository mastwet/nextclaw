# v0.0.10 Channels Scroll Constraint

## 迭代完成说明

- 修复 `Channels` 页面在长表单（如 Discord）下，内容滚动影响上层页面容器并出现下方大面积空白的问题。
- 采用“滚动闭环”修复，而不是继续放大卡片高度：
  - 在设置壳 `AppLayout` 对 `Channels` 路由启用 `xl` 断点外层滚动收口（页面外层 `overflow-hidden`），避免内层滚动链把外层容器继续拉伸。
  - `ChannelsList` 页面在 `xl` 下切为 `h-full + flex` 的固定高度布局，保持与双栏断点一致。
  - 渠道列表和渠道表单内部滚动区补 `overscroll-contain`，阻断滚动冒泡到更上层容器。
- 回退了此前对渠道卡片 `h-full/max-h-none` 的强制覆盖，避免破坏原有卡片高度约束。

涉及文件：

- `packages/nextclaw-ui/src/components/layout/AppLayout.tsx`
- `packages/nextclaw-ui/src/components/config/ChannelsList.tsx`
- `packages/nextclaw-ui/src/components/config/ChannelForm.tsx`
