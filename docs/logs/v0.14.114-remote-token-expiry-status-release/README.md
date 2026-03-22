# v0.14.114 Remote Token Expiry Status Release

## 迭代完成说明

- 按标准 NPM 发布流程完成 remote token 过期判定修复的版本发布。
- 实际发布包：
  - `@nextclaw/ncp-mcp@0.1.20`
  - `@nextclaw/mcp@0.1.20`
  - `@nextclaw/remote@0.1.16`
  - `@nextclaw/server@0.10.20`
  - `nextclaw@0.13.24`
- 其中 `@nextclaw/mcp`、`@nextclaw/server`、`@nextclaw/ncp-mcp` 为 release group / 内部依赖联动发版。

## 测试 / 验证 / 验收方式

- 发布前全量校验：
  - `pnpm release:publish`
  - 内含 `pnpm build`
  - 内含 `pnpm lint`
  - 内含 `pnpm tsc`
- npm 线上版本确认：
  - `npm view nextclaw@0.13.24 version`
  - `npm view @nextclaw/remote@0.1.16 version`
  - `npm view @nextclaw/server@0.10.20 version`
  - `npm view @nextclaw/mcp@0.1.20 version`
  - `npm view @nextclaw/ncp-mcp@0.1.20 version`
- 已发布包隔离冒烟：
  - 在 `/tmp` 临时目录下写入过期平台 token 的 `NEXTCLAW_HOME/config.json`
  - 执行 `pnpm dlx nextclaw@0.13.24 remote doctor --json`
  - 验证 `platform-token` 检查返回 `platform session token expired; run remote browser login or "nextclaw login" again`

## 发布 / 部署方式

- 已执行：
  - `pnpm release:version`
  - `pnpm release:publish`
- 已自动创建 git tags：
  - `@nextclaw/ncp-mcp@0.1.20`
  - `@nextclaw/mcp@0.1.20`
  - `@nextclaw/remote@0.1.16`
  - `@nextclaw/server@0.10.20`
  - `nextclaw@0.13.24`
- 本次不涉及数据库 migration、Cloudflare Worker 部署或前端站点部署。

## 用户 / 产品视角的验收步骤

1. 执行 `npm i -g nextclaw@0.13.24` 或升级到该版本。
2. 如果本地平台登录已过期，打开 remote access 页面或执行 `nextclaw remote doctor --json`。
3. 预期不再看到“误判为已登录后才报远程连接异常”的状态。
4. 预期诊断直接提示平台 token 已过期，需要重新登录。
5. 重新登录平台账号后再次开启 remote access。
6. 预期设备恢复注册，设备列表能重新看到该设备。
