# v0.14.306-chat-model-picker-recents-release

## 迭代完成说明

- 基于聊天模型选择优化迭代，完成前端发布闭环。
- 已成功发布：
  - `@nextclaw/ui@0.11.14`
  - `nextclaw@0.16.24`
- 发布过程中同步生成并落地了版本号、changelog 与 `nextclaw/ui-dist` 前端产物更新。
- 本次未将无关的 `ncp-chat-realtime-reload` 本地改动混入发布提交范围。

## 测试/验证/验收方式

- 定向单测：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui test -- --run src/components/chat/adapters/chat-input-bar.adapter.test.ts`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- 构建：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build`
- 真实 UI 冒烟：
  - 使用隔离目录 `NEXTCLAW_HOME=/tmp/nextclaw-ui-smoke-4IAo1L`
  - 启动：`PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME=/tmp/nextclaw-ui-smoke-4IAo1L node packages/nextclaw/dist/cli/index.js serve --ui-port 18892`
  - 观察点：
    - 模型下拉共有 `11` 项，满足“模型较多”场景
    - 下拉项为单行展示
    - 连续选择 `Anthropic/claude-sonnet-4-6`、`DeepSeek/deepseek-chat`、`DeepSeek/deepseek-reasoner` 后出现 `Recent`
    - `Recent` 顺序为 `DeepSeek/deepseek-reasoner` → `DeepSeek/deepseek-chat` → `Anthropic/claude-sonnet-4-6`
- 发布专项检查：
  - `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:frontend`
- 结果摘要：
  - 发布成功，npm 返回 `packages published successfully`
  - 已创建 git tag：
    - `@nextclaw/ui@0.11.14`
    - `nextclaw@0.16.24`
  - 发布检查中的 `lint` 仅存在仓库既有 warning，无新增 error 阻塞

## 发布/部署方式

- 已执行仓库既有前端发布闭环：
  - `PATH=/opt/homebrew/bin:$PATH NPM_CONFIG_USERCONFIG=/Users/peiwang/Projects/nextbot/.npmrc pnpm release:frontend`
- 流程实际包含：
  - 自动生成 UI changeset
  - `release:version`
  - `release:publish:frontend`
  - `changeset publish`
  - `changeset tag`

## 用户/产品视角的验收步骤

1. 安装或升级到 `nextclaw@0.16.24`，打开聊天页。
2. 点击底部输入区的模型选择下拉。
3. 确认模型项为单行 `provider/model` 展示。
4. 在模型较多时连续切换多个模型。
5. 再次打开下拉，确认顶部出现 `Recent` / `最近选择` 分组。
6. 确认最近项顺序为“最新选择在最前”，且最多显示 `3` 个。
