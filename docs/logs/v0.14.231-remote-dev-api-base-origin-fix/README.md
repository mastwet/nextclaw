# v0.14.231-remote-dev-api-base-origin-fix

## 迭代完成说明

- 修复 `pnpm dev start` 远程访问场景下前端把 `VITE_API_BASE=http://127.0.0.1:<backend-port>` 直接暴露给浏览器的问题。
- 根因是同一个 `VITE_API_BASE` 既被当作浏览器公开的 API base，又被当作 Vite 本地代理目标；当 remote 页面复用 dev 前端壳时，浏览器会先向本机 `127.0.0.1:<backend-port>` 发起 `/_remote/runtime` 与 `/api/*` 请求，进而触发 CORS，导致 remote transport 根本没有机会接管。
- 现在将两类职责显式拆分：
  - 浏览器公开 API base 仍由 `packages/nextclaw-ui/src/api/api-base.ts` 解析；未显式配置时稳定回退到 `window.location.origin`
  - Vite dev server 的本地代理目标改为专用环境变量 `VITE_DEV_PROXY_API_BASE`
- `scripts/dev-runner.mjs` 不再向浏览器注入 `VITE_API_BASE`，只向 Vite 开发服务器注入 `VITE_DEV_PROXY_API_BASE`，从而保证 remote 页面在浏览器里会以当前远程页面 origin 解析 `/_remote/runtime`，后续再切换到 `/_remote/ws` 多路复用传输。
- 新增 `packages/nextclaw-ui/src/api/api-base.test.ts`，锁定“显式 API base 优先，否则回退到当前页面 origin”的契约。

## 测试/验证/验收方式

- 定向单测：
  - `pnpm -C packages/nextclaw-ui test -- --run src/api/api-base.test.ts src/transport/app-client.test.ts src/transport/remote.transport.test.ts`
  - 结果：通过，`5` 个测试全部通过。
- 类型检查：
  - `pnpm -C packages/nextclaw-ui tsc --pretty false`
  - 结果：通过。
- 隔离 dev 冒烟：
  - `NEXTCLAW_HOME=/tmp/nextclaw-remote-dev-fix.<id> NEXTCLAW_DEV_BACKEND_PORT=18892 NEXTCLAW_DEV_FRONTEND_PORT=5274 pnpm dev start`
  - `curl http://127.0.0.1:5274/src/api/api-base.ts`
  - 验证点：Vite 返回给浏览器的模块环境里不再包含 `VITE_API_BASE`，只包含 `VITE_DEV_PROXY_API_BASE`
  - 验证点：模块实现仍会在未显式配置 `VITE_API_BASE` 时回退到 `window.location.origin`
  - `curl http://127.0.0.1:5274/api/health`
  - `curl http://127.0.0.1:18892/api/health`
  - 结果：前端代理与 backend 健康检查均正常。
- 可维护性检查：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-ui/vite.config.ts scripts/dev-runner.mjs packages/nextclaw-ui/src/api/api-base.ts packages/nextclaw-ui/src/api/api-base.test.ts packages/nextclaw-ui/src/vite-env.d.ts`
  - 结果：无阻塞项；有 2 条目录预算警告，分别位于 `packages/nextclaw-ui/src/api` 与 `scripts`，本次未新增阻塞性可维护性问题。

## 发布/部署方式

- 本次触达 `packages/nextclaw-ui` 与仓库级 dev runner，本地源码验证完成后，按既有 NPM/CLI 发布流程发布包含以下改动的版本：
  - `packages/nextclaw-ui`
  - 使用该 dev runner 的仓库源码分发
- 若仅用于本地开发态验证，无需单独部署 platform worker 或 platform console。

## 用户/产品视角的验收步骤

1. 在本地仓库启动 `pnpm dev start`。
2. 在本地 UI 中开启 remote access，并从平台远程打开该 dev 实例。
3. 打开浏览器 DevTools，确认 remote 页面不再出现针对 `http://127.0.0.1:<backend-port>/_remote/runtime` 或 `http://127.0.0.1:<backend-port>/api/*` 的 CORS 报错。
4. 在 Network 面板确认 remote 页面先命中当前远程页面 origin 下的 `/_remote/runtime`。
5. 继续操作远程页面，确认后续动态请求通过 `/_remote/ws` 多路复用通道工作，而不是直接从浏览器跨域访问本机 backend。
