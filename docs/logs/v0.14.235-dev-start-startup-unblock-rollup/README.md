# v0.14.235-dev-start-startup-unblock-rollup

## 迭代完成说明

- 汇总并提交本轮 `pnpm dev start` 启动链路优化，核心目标是让前端更早可见、后端更早可连、插件与渠道不再抢占首屏可用窗口。
- 前端 auth bootstrap 改为“先展示应用壳，再后台短超时重试认证状态”，不再用全屏阻断卡片拦首屏；仅在明确 `enabled && !authenticated` 时切换登录页。
- `scripts/dev-runner.mjs` 改为先拉起 backend、轮询端口 ready、再启动 Vite，从而消除开发态初始阶段的 `ECONNREFUSED` 代理报错。
- dev 前端的浏览器公开 API base 与 Vite 本地代理目标彻底拆分：浏览器侧继续按 `window.location.origin` / `VITE_API_BASE` 解析，Vite proxy 只使用 `VITE_DEV_PROXY_API_BASE`，避免 remote dev 场景错误直连本机 backend。
- 服务端启动编排补充了 startup trace、UI shell grace window、plugin loader trace 与更清晰的 shell/context 切分，便于继续分析“基座 ready”与插件/渠道启动之间的时间边界。
- `useHydratedNcpAgent` 补了“切换新 session 时立即回到 hydrating 态”的状态修正与测试，避免新 session 切换瞬间沿用旧 hydration 完成态。

## 测试/验证/验收方式

- UI 定向单测：
  - `pnpm -C packages/nextclaw-ui exec vitest run src/App.test.tsx src/hooks/use-auth.test.ts src/api/api-base.test.ts src/components/chat/useHydratedNcpAgent.test.tsx`
- UI 类型检查：
  - `pnpm -C packages/nextclaw-ui tsc -p tsconfig.json`
- CLI / compat 类型检查：
  - `pnpm -C packages/nextclaw tsc`
  - `pnpm -C packages/nextclaw-openclaw-compat tsc`
- 开发态冒烟：
  - `pnpm dev start`
  - 观察点：先出现 backend ready，再出现 Vite ready；前端首屏不再被 auth bootstrap 全屏阻断；初始阶段不再刷 `ECONNREFUSED` 代理报错。

## 发布/部署方式

- 本次触达 `nextclaw` CLI、`@nextclaw/ui`、`@nextclaw/openclaw-compat` 与仓库级 dev runner。
- 若要正式发布，按既有 changeset / version / publish 流程同步发出受影响包，并在发布包环境复验 `pnpm dev start` 的启动顺序与首屏行为。
- 若仅用于本地源码开发验证，无需额外部署远端服务。

## 用户/产品视角的验收步骤

1. 在本地仓库执行 `pnpm dev start`。
2. 观察终端，确认 backend 先 ready，随后 frontend 再启动，不再出现启动即刷屏的 `/api/*` 代理拒绝连接报错。
3. 打开前端页面，确认应用壳会尽快出现，不再长时间被“等待本地 UI 服务启动”之类的首屏阻断卡住。
4. 进入聊天页与配置页，确认基础导航与页面结构可先用，再等待插件/渠道后台继续热启动。
5. 若使用 remote dev 页面，确认浏览器请求命中当前页面 origin，而不是错误直连本机 `127.0.0.1:<backend-port>`。
