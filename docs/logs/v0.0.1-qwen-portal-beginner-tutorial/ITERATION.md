# v0.0.1-qwen-portal-beginner-tutorial

## 迭代完成说明（改了什么）

1. 在文档站新增面向小白用户的 `Qwen Portal` 配置教程：
- 中文：`apps/docs/zh/guide/tutorials/qwen-portal.md`
- 英文：`apps/docs/en/guide/tutorials/qwen-portal.md`

2. 教程内容聚焦“免费、直接授权即可使用”的新手路径：
- 明确在开头说明 `chat.qwen.ai` 无需预先拥有单独账号，可按页面提供方式注册或登录。
- 覆盖 `浏览器授权` 主流程。
- 补充 `从 Qwen CLI 导入` 作为已登录 CLI 用户的快捷路径。
- 提供最小可执行测试提示词，便于用户自验。

3. 文档站入口同步接入：
- 更新中英文教程总览页。
- 更新 VitePress 中英文侧边栏，使教程可直接被发现。

## 测试/验证/验收方式

1. 构建验证
- 执行 `pnpm -C apps/docs build`
- 预期：VitePress 构建成功，新增教程页面被正常生成。

2. 文档结构校验
- 执行 `pnpm docs:i18n:check`
- 预期：中英文文档结构检查通过。

3. 冒烟验证
- 构建后检查输出目录中存在：
  - `apps/docs/.vitepress/dist/zh/guide/tutorials/qwen-portal.html`
  - `apps/docs/.vitepress/dist/en/guide/tutorials/qwen-portal.html`

4. 不适用项说明
- 本次仅涉及文档站内容新增，不涉及 TypeScript 源码、运行时逻辑或后端功能改动，因此仓库级 `lint` / `tsc` 不作为本次必要验证项。

## 发布/部署方式

1. 本地预览/验证
- `pnpm -C apps/docs build`
- 如需本地预览，可执行 `pnpm -C apps/docs preview`

2. 文档站发布
- 执行 `pnpm deploy:docs`

3. 不适用项说明
- 本次无 npm 包发布。
- 本次无数据库 migration。
- 本次无后端/Worker 部署。

## 用户/产品视角的验收步骤

1. 打开文档站教程总览页，确认能看到“Qwen Portal 免费配置教程（小白版）”。
2. 进入教程页，确认开头明确说明 `chat.qwen.ai` 无需预先拥有单独账号，可按页面提供方式注册或登录。
3. 按教程打开 NextClaw 的 `Providers` 页面，进入 `Qwen Portal`。
4. 点击 `浏览器授权`，在 Qwen 页面完成登录与授权。
5. 返回 NextClaw，确认出现授权完成状态。
6. 选择 `qwen-portal/coder-model` 发起一条测试消息，确认可正常响应。
