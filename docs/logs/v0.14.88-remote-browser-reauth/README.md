# v0.14.88 Remote Browser Reauth

## 迭代完成说明

- 将 Remote Access 的平台登录改成浏览器授权流：
  - 本地 UI 通过 `/api/remote/auth/start` 发起授权
  - 平台 worker 提供 `/platform/auth/browser/*` 授权会话与网页入口
  - 本地 UI 通过 `/api/remote/auth/poll` 自动轮询并写回 `providers.nextclaw.apiKey`
- 修复“退出登录后仍显示已登录”的真实缺陷：
  - 根因是内置 `nc_free_*` key 被错误识别成平台登录态
  - 现在只把真正的平台 session token 识别为已登录
- 补齐相关文档：
  - 更新 Remote Access 功能文档
  - 更新 Remote Access UI 教程
  - 更新平台 worker README 中的认证接口说明
- 补齐验证与回归：
  - server/CLI 定向测试更新
  - 本地 UI + 线上平台真实授权链路冒烟

## 测试/验证/验收方式

- 定向测试
  - `pnpm -C packages/nextclaw-server exec vitest run src/ui/router.remote.test.ts`
  - `pnpm -C packages/nextclaw exec vitest run src/cli/commands/remote-access-host.test.ts`
- 受影响构建/类型/静态检查
  - `pnpm -C workers/nextclaw-provider-gateway-api build`
  - `pnpm -C workers/nextclaw-provider-gateway-api tsc`
  - `pnpm -C workers/nextclaw-provider-gateway-api lint`
  - `pnpm -C packages/nextclaw-server build`
  - `pnpm -C packages/nextclaw-server tsc`
  - `pnpm -C packages/nextclaw-server lint`
  - `pnpm -C packages/nextclaw-ui build`
  - `pnpm -C packages/nextclaw-ui tsc`
  - `pnpm -C packages/nextclaw-ui lint`
  - `pnpm -C packages/nextclaw build`
  - `pnpm -C packages/nextclaw tsc`
- 真实端到端冒烟
  - 在隔离目录 `NEXTCLAW_HOME=/tmp/nextclaw-remote-auth-smoke` 启动本地 `nextclaw serve --ui-port 18991`
  - 调用本地 `/api/remote/auth/start`
  - 通过线上 `https://ai-gateway-api.nextclaw.io/platform/auth/browser/authorize` 完成一次注册授权
  - 调用本地 `/api/remote/auth/poll`，确认写回登录态
  - 调用本地 `/api/remote/logout`，确认状态立即变为未登录
  - 再次走浏览器授权登录，确认退出后可重新登录

## 发布/部署方式

- 平台后端
  - `pnpm deploy:platform:backend`
  - 本次已执行远端 D1 migration：`0007_platform_browser_auth.sql`
- NPM 发布
  - `pnpm release:version`
  - `pnpm release:publish`
  - 已发布：
    - `nextclaw@0.13.10`
    - `@nextclaw/server@0.10.10`
    - `@nextclaw/ui@0.9.4`
    - `@nextclaw/mcp@0.1.10`
    - `@nextclaw/ncp-mcp@0.1.10`
    - `@nextclaw/remote@0.1.6`
- 文档站
  - `pnpm deploy:docs`

## 用户/产品视角的验收步骤

1. 打开本地 NextClaw UI 的 `设置 -> 远程访问`。
2. 在 `平台账号` 区域点击 `前往浏览器授权`。
3. 浏览器打开 NextClaw 平台授权页，在网页里登录或注册。
4. 返回本地 UI，确认页面自动变成已登录状态，并显示账号邮箱。
5. 点击 `退出登录`，确认页面立刻变成未登录状态。
6. 再次点击 `前往浏览器授权`，确认可以重新登录，不需要 CLI。
7. 如需继续开通远程访问，再保存设备设置、启动或重启服务，并运行诊断。
