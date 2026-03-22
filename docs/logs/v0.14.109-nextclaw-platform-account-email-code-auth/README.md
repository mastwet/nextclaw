# v0.14.109-nextclaw-platform-account-email-code-auth

## 迭代完成说明

- 将 `NextClaw Platform` 的用户登录入口切换为邮箱验证码模型，不再在平台前端暴露“邮箱密码注册/登录”双模型。
- 新增平台邮箱验证码主链：
  - `POST /platform/auth/email/send-code`
  - `POST /platform/auth/email/verify-code`
  - `POST /platform/auth/browser/send-code`
  - `POST /platform/auth/browser/verify-code`
- 新增 D1 migration：`platform_email_auth_codes`，用于存储验证码发送与验证状态，并实现 resend cooldown。
- 浏览器授权页改为 `NextClaw Account` 邮箱验证码授权，和桌面端 remote access 的 browser auth 链路保持一致。
- `apps/platform-console` 统一品牌命名为 `NextClaw Platform / NextClaw Account`，登录页改为单一验证码流，并优化了平台壳层与设备页样式。
- 清理 CLI / UI router 中暴露的 `--register` 与 `register` 请求字段，避免继续对外暴露旧注册契约。
- 更新文档：
  - [账号与远程访问产品设计](../../plans/2026-03-21-nextclaw-account-and-remote-access-product-design.md)
  - [远程访问整体执行计划](../../plans/2026-03-21-nextclaw-remote-access-overall-execution-plan.md)

## 测试/验证/验收方式

- Worker：
  - `pnpm -C workers/nextclaw-provider-gateway-api build`
  - `pnpm -C workers/nextclaw-provider-gateway-api lint`
  - `pnpm -C workers/nextclaw-provider-gateway-api tsc`
- 平台前端：
  - `pnpm -C apps/platform-console build`
  - `pnpm -C apps/platform-console lint`
  - `pnpm -C apps/platform-console tsc`
- 受影响工作区：
  - `pnpm -C packages/nextclaw build`
  - `pnpm -C packages/nextclaw lint`
  - `pnpm -C packages/nextclaw tsc`
  - `pnpm -C packages/nextclaw-server build`
  - `pnpm -C packages/nextclaw-server lint`
  - `pnpm -C packages/nextclaw-server tsc`
  - `pnpm -C packages/nextclaw-ui build`
  - `pnpm -C packages/nextclaw-ui lint`
  - `pnpm -C packages/nextclaw-ui tsc`
- 定向测试：
  - `pnpm -C packages/nextclaw-server test -- src/ui/router.remote.test.ts`
- 平台 smoke：
  - `node scripts/platform-mvp-smoke.mjs`
  - 结果：通过，覆盖管理员密码登录、普通用户邮箱验证码登录/自动建号、权限检查、充值申请、额度扣减、不可变 ledger。

## 发布/部署方式

- 代码已经具备发布条件，但生产环境当前缺少真实邮件发送配置，暂不应直接发布新的平台前端。
- 生产发布前必须先配置：
  - `PLATFORM_AUTH_EMAIL_PROVIDER=resend`
  - `PLATFORM_AUTH_EMAIL_FROM`
  - `RESEND_API_KEY`
- 配置完成后的发布顺序：
  1. `pnpm platform:db:migrate:remote`
  2. `pnpm -C workers/nextclaw-provider-gateway-api run deploy`
  3. `pnpm deploy:platform:console`
  4. 线上验证验证码发送、登录、设备列表与打开设备链路
- 当前检查结果：
  - `wrangler secret list` 仅有 `DASHSCOPE_API_KEY`
  - 尚无邮件 provider secret，因此本次不执行生产发布

## 用户/产品视角的验收步骤

1. 打开 `NextClaw Platform` 登录页，输入邮箱并发送验证码。
2. 收到验证码后输入 6 位码，成功进入平台；若邮箱首次使用，应自动创建账号并直接登录。
3. 在桌面端登录同一个 `NextClaw Account` 并开启远程访问。
4. 返回平台设备页，确认本地设备出现在列表中。
5. 点击“在网页中打开”，确认可以继续进入对应设备页面。
6. 在 remote access 的 browser auth 场景中，确认点击桌面端登录后会打开浏览器授权页，并通过邮箱验证码完成授权。
