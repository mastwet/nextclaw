# v0.14.180-remote-quota-visible-and-raised

## 迭代完成说明

- 将 remote quota 默认阈值调整为更符合当前使用预期的最小模型：
  - 用户每日 Worker 额度：`20000`
  - 用户每日 Durable Object 额度：`20000`
  - 单实例浏览器连接上限：`10000`
- 在 provider gateway worker 新增只读 quota summary 能力：
  - `GET /platform/remote/quota`
  - `GET /platform/admin/remote/quota`
- 在 `platform-console` 用户页新增 “Remote 额度与用量” 卡片，展示：
  - 今日 Worker 已用 / 总额度 / 剩余
  - 今日 Durable Object 已用 / 总额度 / 剩余
  - session 每分钟上限、当前活跃浏览器连接、单实例连接上限、重置时间
- 在 `platform-admin` 管理页新增 “Remote 额度总览” 卡片，展示：
  - 平台 Worker / Durable Object 总预算、实际放量额度、已用量、剩余额度
  - 默认用户日额度、session 限流、单实例连接上限、重置时间
- 补充 remote quota summary 单测与 user/admin 平台 smoke 脚本，并更新 worker README 的接口清单。

## 测试 / 验证 / 验收方式

- Worker 校验：
  - `pnpm -C workers/nextclaw-provider-gateway-api build`
  - `pnpm -C workers/nextclaw-provider-gateway-api lint`
  - `pnpm -C workers/nextclaw-provider-gateway-api tsc`
  - `pnpm -C workers/nextclaw-provider-gateway-api test:quota`
- Frontend 校验：
  - `pnpm -C apps/platform-console build`
  - `pnpm -C apps/platform-console lint`
  - `pnpm -C apps/platform-console tsc`
  - `pnpm -C apps/platform-admin build`
  - `pnpm -C apps/platform-admin lint`
  - `pnpm -C apps/platform-admin tsc`
- 冒烟：
  - 本地预览 user console 后执行：`node scripts/platform-console-smoke.mjs`
  - 本地预览 admin console 后执行：`node scripts/platform-admin-smoke.mjs`
  - 结果：两条 smoke 均通过，确认 quota 卡片已实际渲染。
- 可维护性自检：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths workers/nextclaw-provider-gateway-api/src/controllers/remote-controller.ts workers/nextclaw-provider-gateway-api/src/controllers/remote-quota-controller.ts apps/platform-console/src/pages/UserDashboardPage.tsx apps/platform-admin/src/pages/AdminDashboardPage.tsx`
  - 结果：无阻塞项；`apps/platform-admin/src/pages/AdminDashboardPage.tsx` 与 `workers/nextclaw-provider-gateway-api/src/controllers/remote-controller.ts` 仍接近预算线，但未新增阻塞。

## 发布 / 部署方式

- 本次发布不涉及数据库 schema 变化，远程 migration：不适用。
- 已执行：
  - `pnpm -C workers/nextclaw-provider-gateway-api run deploy`
    - Worker Version ID: `f8ae6e7d-b041-40e9-ba6c-8fccabff7662`
  - `pnpm deploy:platform:console`
    - Preview URL: `https://338796b3.nextclaw-platform-console.pages.dev`
  - `pnpm deploy:platform:admin`
    - Preview URL: `https://772e64ac.nextclaw-platform-admin.pages.dev`
- 线上探活：
  - `curl https://ai-gateway-api.nextclaw.io/health`
    - 返回 `{"ok":true,"data":{"status":"ok"...}}`
  - `curl -I https://platform.nextclaw.io`
    - 返回 `HTTP/2 200`
  - `curl -I https://platform-admin.nextclaw.io`
    - 返回 `HTTP/2 200`
  - 未登录访问新接口：
    - `GET /platform/remote/quota` 返回 `401 UNAUTHORIZED`
    - `GET /platform/admin/remote/quota` 返回 `401 UNAUTHORIZED`
    - 说明路由已上线且进入鉴权链路，不是 404。

## 用户 / 产品视角的验收步骤

1. 登录 [platform.nextclaw.io](https://platform.nextclaw.io)。
2. 在用户首页确认出现 “Remote 额度与用量” 卡片。
3. 检查卡片内是否能看到：
   - 今日 Worker 已用 / 总额度 / 剩余
   - 今日 Durable Object 已用 / 总额度 / 剩余
   - 单 session 每分钟上限
   - 当前活跃浏览器连接
   - 单实例连接上限应为 `10000`
4. 使用管理员账号登录 [platform-admin.nextclaw.io](https://platform-admin.nextclaw.io)。
5. 在管理首页确认出现 “Remote 额度总览” 卡片，并能看到：
   - 平台 Worker / Durable Object 已用与剩余
   - 默认用户日额度均为 `20000`
   - 单实例连接上限为 `10000`
6. 如需复核接口行为，带登录 token 调用：
   - `GET /platform/remote/quota`
   - `GET /platform/admin/remote/quota`
