# NextClaw Provider Gateway API (Serious Platform MVP)

Cloudflare Worker + Hono + D1。

核心能力：
- 用户登录后才能调用 `/v1/chat/completions`
- 双额度模型：
  - 用户个人免费额度（`free_limit_usd`）
  - 全平台总免费额度池（`global_free_limit_usd`）
- 支持充值（USD 直充，不引入 points/credits）
- 管理后台 API（用户、额度、充值审核、平台设置）

## 1. 初始化

```bash
pnpm -C workers/nextclaw-provider-gateway-api install
pnpm -C workers/nextclaw-provider-gateway-api db:migrate:local
```

远程环境：

```bash
pnpm -C workers/nextclaw-provider-gateway-api db:migrate:remote
```

## 2. 本地开发

```bash
pnpm -C workers/nextclaw-provider-gateway-api dev
```

## 3. 环境变量（`wrangler.toml`）

- `DASHSCOPE_API_KEY`：上游模型 API Key（secret）
- `AUTH_TOKEN_SECRET`：登录 token 签名密钥（生产至少 32 字符随机字符串）
- `GLOBAL_FREE_USD_LIMIT`：总免费额度池（USD）
- `REQUEST_FLAT_USD_PER_REQUEST`：每次请求固定费用（USD，可选）

## 4. 主要接口

### 用户认证
- `POST /platform/auth/register`
- `POST /platform/auth/login`
- `GET /platform/auth/me`
- `POST /platform/auth/browser/start`
- `POST /platform/auth/browser/poll`
- `GET /platform/auth/browser`
- `POST /platform/auth/browser/authorize`

### 用户账单
- `GET /platform/billing/overview`
- `GET /platform/billing/ledger`
- `GET /platform/billing/recharge-intents`
- `POST /platform/billing/recharge-intents`

### 管理后台
- `GET /platform/admin/overview`
- `GET /platform/admin/users`
- `PATCH /platform/admin/users/:userId`
- `GET /platform/admin/recharge-intents`
- `POST /platform/admin/recharge-intents/:intentId/confirm`
- `POST /platform/admin/recharge-intents/:intentId/reject`
- `PATCH /platform/admin/settings`

### OpenAI 兼容
- `GET /v1/models`
- `GET /v1/usage`
- `POST /v1/chat/completions`

> 注意：
> - `platform/auth/browser/*` 为本地 NextClaw Remote Access 提供浏览器授权页，支持网页登录或网页注册后再把 token 回传给本地设备。
> - `/v1/*` 的 `Authorization: Bearer <token>` 必须是登录 token，不再支持匿名体验 key。
> - 登录接口具备基础防暴力破解能力：IP 失败限流 + 账号失败锁定。

## 5. 质量检查

```bash
pnpm -C workers/nextclaw-provider-gateway-api build
pnpm -C workers/nextclaw-provider-gateway-api lint
pnpm -C workers/nextclaw-provider-gateway-api tsc
```

## 6. 部署

```bash
pnpm -C workers/nextclaw-provider-gateway-api deploy
```
