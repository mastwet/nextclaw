# 2026-02-27 v0.0.1-marketplace-install-nonblocking

## 迭代完成说明（改了什么）

- 修复 Marketplace 安装按钮“全局阻塞”问题。
- 变更前：任一条目安装中会禁用全部可安装条目。
- 变更后：仅禁用当前正在安装的条目，其他条目可继续点击安装。
- 实现方式：
  - 将安装状态从单一 `isPending/installingSpec` 改为 `installingSpecs`（按 spec 追踪）。
  - `handleInstall` 改为 `mutateAsync + try/finally`，确保单条目安装结束后准确清理状态。

## 测试 / 验证 / 验收方式

- 构建：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- Lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`
  - 结果：未通过，存在仓库内既有错误（`CronConfig.tsx`、`SessionsConfig.tsx` 的 `PageBody` 未使用），与本次改动无关。
- 冒烟（隔离目录 `/tmp`，源码断言）：
  - `cd /tmp && PATH=/opt/homebrew/bin:$PATH node -e "..."`
  - 观察点：
    - 不再存在 `disabled={props.installState.isPending}`。
    - 存在按条目判断 `installingSpecs.has(installSpec)`。

## 发布 / 部署方式

1. 合并代码。
2. 按常规前端发布流程发布 UI 包并重启服务加载新前端资源。
3. 若仅本次 UI 变更，可按项目 `release-frontend` 流程执行。

## 用户 / 产品视角的验收步骤

1. 打开 Marketplace 页面（插件或技能）。
2. 对 A 条目点击安装，观察 A 进入“Installing...”。
3. 在 A 安装未完成时，点击 B 条目安装。
4. 预期：B 可点击并进入安装，不会被 A 的安装状态全局禁用。
5. 安装结束后，A/B 按各自结果刷新 installed 状态。
