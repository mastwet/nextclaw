# v0.0.1-channel-doc-tutorial-module

## 迭代完成说明（改了什么）

- 文档站新增 `Tutorials/教程` 模块，增加飞书教程页面：
  - `apps/docs/en/guide/tutorials.md`
  - `apps/docs/en/guide/tutorials/feishu.md`
  - `apps/docs/zh/guide/tutorials.md`
  - `apps/docs/zh/guide/tutorials/feishu.md`
- VitePress 侧栏与导航新增教程入口（中英文）：
  - `apps/docs/.vitepress/config.ts`
- 配置元数据支持“渠道教程多语言链接 + 默认链接”：
  - `packages/nextclaw-server/src/ui/types.ts`
  - `packages/nextclaw-server/src/ui/config.ts`
- UI 新增渠道教程链接解析器，并在两个位置展示教程入口：
  - 渠道卡片（Channels 页面）
  - 渠道配置弹窗（ChannelForm）
  - 对应文件：
    - `packages/nextclaw-ui/src/lib/channel-tutorials.ts`
    - `packages/nextclaw-ui/src/components/config/ChannelsList.tsx`
    - `packages/nextclaw-ui/src/components/config/ChannelForm.tsx`
    - `packages/nextclaw-ui/src/api/types.ts`

## 测试 / 验证 / 验收方式

```bash
pnpm build
pnpm lint
pnpm tsc
```

UI 冒烟建议：

```bash
pnpm --filter @nextclaw/ui dev
pnpm --filter @nextclaw/server dev
```

观察点：

- `GET /api/config/meta` 的 `channels[*]` 返回 `tutorialUrls`（含 `default/en/zh` 或默认值）。
- Channels 卡片右下角教程按钮点击后，文档在右侧 Doc Browser 打开。
- 打开某个渠道配置弹窗后，标题下方显示“查看指南/View Guide”，点击后同样在右侧打开文档。
- 飞书渠道教程链接指向文档站飞书教程页，教程页内提供飞书文档外链。

## 发布 / 部署方式

- 文档站（`apps/docs`）照常执行 docs 部署流水线即可，无额外迁移步骤。
- 后端/UI 发版按常规包发布流程：
  - `@nextclaw/server`
  - `@nextclaw/ui`
- 本次无数据库变更、无 migration 要求。

## 用户 / 产品视角验收步骤

1. 打开文档站，确认导航/侧栏出现“教程/Tutorials”。
2. 进入“飞书配置教程/Feishu Setup”，确认页面展示飞书文档链接。
3. 打开 NextClaw UI 的 Channels 页面，确认每个渠道卡片都有教程入口。
4. 点击飞书渠道教程入口，确认右侧内嵌文档浏览器打开 `docs.nextclaw.io` 文档页。
5. 打开飞书渠道配置弹窗，确认弹窗头部也有教程入口并可打开右侧文档。
