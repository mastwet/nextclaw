# v0.14.234-dev-runner-backend-ready-before-frontend

## 迭代完成说明

- 调整 `scripts/dev-runner.mjs` 的启动顺序：
  - 先拉起 backend
  - 轮询 backend 端口进入 accept 状态
  - backend 可连后再拉起 frontend
- 目的不是继续优化插件加载，而是消除 frontend 抢跑导致的 dev 启动噪音：
  - `http proxy error: /api/auth/status`
  - `http proxy error: /api/remote/status`
  - `ws proxy error`
  - `ECONNREFUSED 127.0.0.1:<port>`
- 保留了前面已经做过的 auth bootstrap 非阻塞策略：
  - auth 启动期或稳定错误都不再全屏拦截首屏
  - 页面优先进壳，登录态只在明确需要登录时再切换到登录页

## 测试/验证/验收方式

- 前端测试：
  - `pnpm -C packages/nextclaw-ui exec vitest run src/App.test.tsx src/hooks/use-auth.test.ts src/api/client.test.ts`
- 前端类型检查：
  - `pnpm -C packages/nextclaw-ui tsc -p tsconfig.json`
- 启动顺序冒烟：
  - 使用真实 `NEXTCLAW_HOME=/Users/peiwang/.nextclaw`
  - 冷启动 `pnpm dev start`
  - 验证结果：
    - `frontend_ready_ms ~= 2043`
    - `proxy_auth_ready_ms ~= 2176`
    - `proxy_errors = []`
    - 日志顺序为 `✓ UI API` 先出现，再出现 `VITE ready`
- 二次冷启动复测：
  - `frontend_http_ready_ms ~= 910`
  - `direct_auth_ready_ms ~= 2665`
  - `proxy_auth_ready_ms ~= 2669`

## 发布/部署方式

- 本次为本地 dev 启动链路优化，无独立线上部署动作
- 后续若随版本发布，按常规发布闭环执行，并补充 dev 启动冒烟：
  - `pnpm dev start`
  - 打开本地 UI
  - 确认不再出现启动期 `ECONNREFUSED`/proxy error 噪音

## 用户/产品视角的验收步骤

1. 在仓库根目录执行 `pnpm dev start`
2. 观察终端启动日志
3. 预期 backend 的 `✓ UI API` 会先出现，frontend 再打印 `VITE ready`
4. 启动初期不应再刷出 `http proxy error` 或 `ws proxy error`
5. 打开本地 UI 后，页面应直接进入界面，不再被 auth bootstrap 错误卡成全屏拦截
