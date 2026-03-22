# v0.14.125 Remote Instance Wildcard Subdomain Routing

## 迭代完成说明

- 远程实例公开访问入口从单一域名 `remote.claw.cool` 收敛为实例级子域名：`https://r-<access-session-id>.claw.cool`。
- `workers/nextclaw-provider-gateway-api/wrangler.toml` 改为通过 Worker route `*.claw.cool/*` 接管实例访问流量，同时保留 `ai-gateway-api.nextclaw.io` 作为纯 API 域名。
- `workers/nextclaw-provider-gateway-api/src/services/remote-access-service.ts` 现在按访问会话生成实例级 host，并仅从 `r-<sessionId>.claw.cool` 解析访问会话，不再把 API 域名或单一分享入口域名混入远程页面访问。
- `scripts/remote-relay-hibernation-smoke.mjs` 新增域名形态断言，强制校验 owner open / share open 返回的 `openUrl` 都必须是 `r-<session>.claw.cool/platform/remote/open?token=...`，且分享链接仍然保持在 `platform.nextclaw.io/share/<grantToken>`。
- 内部域名清单已更新为实例级子域名模型，避免继续把 `remote.claw.cool` 记录为产品入口。
- 设计文档参考：[Remote Instance Sharing Design](/Users/tongwenwen/Projects/Peiiii/nextclaw/docs/plans/2026-03-22-nextclaw-remote-instance-sharing-design.md)

## 测试/验证/验收方式

- `pnpm -C workers/nextclaw-provider-gateway-api build`
- `pnpm -C workers/nextclaw-provider-gateway-api lint`
- `pnpm -C workers/nextclaw-provider-gateway-api tsc`
- `node scripts/remote-relay-hibernation-smoke.mjs`
- `curl -sS -o /tmp/r-claw-health.out -w '%{http_code}\n' https://r-test.claw.cool/health`
- `openssl s_client -connect random-instance.claw.cool:443 -servername random-instance.claw.cool </dev/null`

## 发布/部署方式

- Worker 已执行 `pnpm -C workers/nextclaw-provider-gateway-api run deploy`
- 本次 Cloudflare Worker 版本：`963a8549-6fcd-4b75-982d-d1ebd3d9ff0f`
- 线上要求：`claw.cool` zone 中 `*` 记录必须为 `Proxied`，由 Cloudflare 统一承接 `*.claw.cool` 证书与 Worker route
- 本轮仅涉及 Worker 域名路由与本地冒烟脚本，无需新增 migration，也无需重新部署 platform console

## 用户/产品视角的验收步骤

1. 在桌面端启动远程实例，并确保实例在线。
2. 打开 `platform.nextclaw.io`，在实例列表点击打开；浏览器应跳到 `https://r-<access-session-id>.claw.cool/...`。
3. 在同一浏览器内继续打开另一个远程实例；两个实例应各自落在不同子域名，而不是共用一个远程访问 host。
4. 创建分享链接，复制得到的链接应仍然是 `https://platform.nextclaw.io/share/<grantToken>`。
5. 通过分享页继续进入实例后，地址栏应跳到新的 `r-<access-session-id>.claw.cool`，且与 owner open 的 host 不同。
6. 撤销分享链接后，已经打开的共享会话应失效，刷新或继续请求时不能再访问实例内容。
