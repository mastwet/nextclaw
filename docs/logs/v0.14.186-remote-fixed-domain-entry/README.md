# v0.14.186 Remote Fixed Domain Entry

## 迭代完成说明

- 远程访问保留原有的会话子域名入口 `https://r-<access-session-id>.claw.cool`，同时补充固定域名入口 `https://remote.claw.cool`。
- `workers/nextclaw-provider-gateway-api` 为同一个 remote access session 同时返回 `openUrl` 和 `fixedDomainOpenUrl`，固定域名不新增第二套鉴权或代理链路，只复用现有 session token + cookie 机制。
- `apps/platform-console` 的实例列表新增“用固定域名打开 / Open via fixed domain”按钮，用户可显式选择固定域名入口；原“在网页中打开 / Open in browser”继续走会话子域名入口。
- 远程访问相关冒烟脚本同步补齐固定域名断言，并把域名断言抽到公共 smoke support，避免 `scripts/remote-relay-hibernation-smoke.mjs` 继续膨胀。
- 运维域名清单已同步记录固定域名入口：[域名总表（内部）](../../internal/domain-inventory.md)

## 测试/验证/验收方式

- 受影响模块静态验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C workers/nextclaw-provider-gateway-api tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/platform-console build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/platform-console lint`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/platform-console tsc`
- 本地冒烟：
  - `PATH=/opt/homebrew/bin:$PATH pnpm smoke:platform:console`
  - 结果：通过，验证“Open in browser”打开 `r-<session>.claw.cool`，验证“Open via fixed domain”打开 `remote.claw.cool`
  - `PATH=/opt/homebrew/bin:$PATH pnpm smoke:remote-relay`
  - 结果：通过，owner open / share open 均返回 `fixedDomainOpenUrl`，原有子域名链路继续可用
- 可维护性闸门：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths workers/nextclaw-provider-gateway-api/src/types/platform.ts workers/nextclaw-provider-gateway-api/src/services/remote-access-service.ts workers/nextclaw-provider-gateway-api/src/repositories/remote-repository.ts workers/nextclaw-provider-gateway-api/src/controllers/remote-instance-controller.ts workers/nextclaw-provider-gateway-api/src/controllers/remote-controller.ts apps/platform-console/src/api/types.ts apps/platform-console/src/api/client.ts apps/platform-console/src/pages/UserDashboardPage.remote-state.ts apps/platform-console/src/pages/UserDashboardPage.tsx scripts/platform-console-smoke.mjs scripts/remote-relay-hibernation-smoke.mjs scripts/remote-relay-smoke-support.mjs`
  - 结果：无阻塞项；保留 4 条 near-budget warning，未新增恶化债务
- 线上健康检查：
  - `curl -sS -o /tmp/nextclaw-platform-console-health.out -w '%{http_code}\n' https://platform.nextclaw.io` → `200`
  - `curl -sS -o /tmp/nextclaw-api-health.out -w '%{http_code}\n' https://ai-gateway-api.nextclaw.io/health` → `200`
  - `curl -sS -o /tmp/nextclaw-remote-fixed-health.out -w '%{http_code}\n' https://remote.claw.cool/health` → `200`
  - `curl -sS -o /tmp/nextclaw-remote-subdomain-health.out -w '%{http_code}\n' https://r-test.claw.cool/health` → `200`

## 发布/部署方式

- Backend:
  - `PATH=/opt/homebrew/bin:$PATH pnpm deploy:platform:backend`
  - 结果：远程 migration 执行完成，`No migrations to apply!`
  - Worker Version ID: `65c7a946-d8d1-49f6-9cad-fdab90ba4e5f`
- Platform Console:
  - `PATH=/opt/homebrew/bin:$PATH pnpm deploy:platform:console`
  - 结果：Cloudflare Pages 部署完成
  - Preview deployment: `https://4c6ee2ed.nextclaw-platform-console.pages.dev`
- 本次不涉及 Admin 站点代码改动，因此 `deploy:platform:admin` 不适用。

## 用户/产品视角的验收步骤

1. 在桌面端启动并登录支持 remote access 的 NextClaw 实例，确保实例在线。
2. 打开 `https://platform.nextclaw.io`，进入“我的实例”列表。
3. 点击“在网页中打开”，浏览器应进入 `https://r-<access-session-id>.claw.cool/...`。
4. 回到实例列表，点击“用固定域名打开”，浏览器应进入 `https://remote.claw.cool/platform/remote/open?...`，随后正常进入同一实例内容。
5. 在固定域名入口中执行页面刷新、`/_remote/runtime` 初始化、远程聊天等常规动作，行为应与原子域名入口一致。
6. 创建分享链接并打开，分享链路仍应生成新的访问 session；原子域名入口继续可用，固定域名入口也应继续可用。
