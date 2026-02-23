# Marketplace Worker Deploy & Sync

适用范围：`workers/marketplace-api` 只读 API 服务。

## 部署原则

- `workers/marketplace-api/data/catalog.json` 作为 GitHub 单一数据源（source of truth）。
- 默认通过 GitHub Actions 自动同步到线上 Worker。
- 手动部署作为兜底流程（Actions 异常或紧急修复时使用）。

## GitHub Actions 自动同步

workflow：`.github/workflows/marketplace-catalog-sync.yml`

触发条件：

- `master/main` 分支 push 且涉及：
  - `workers/marketplace-api/data/catalog.json`
  - `workers/marketplace-api/src/**`
  - `workers/marketplace-api/wrangler.toml`
  - `workers/marketplace-api/package.json`
  - `workers/marketplace-api/scripts/**`

执行内容：

1. `validate:catalog`
2. `build`
3. `lint`
4. `tsc`
5. `wrangler deploy`
6. 线上 smoke check

必需 Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 部署前检查

```bash
pnpm -C workers/marketplace-api build
pnpm -C workers/marketplace-api lint
pnpm -C workers/marketplace-api tsc
```

## 手动部署命令

```bash
pnpm -C workers/marketplace-api run deploy
```

## 凭证要求

使用本地 `wrangler` 登录态或环境变量（如 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`）。

## 冒烟检查

部署完成后至少验证：

```bash
curl -sS https://marketplace-api.nextclaw.io/health
curl -sS 'https://marketplace-api.nextclaw.io/api/v1/items?page=1&pageSize=5'
```

预期：
- `/health` 返回 `ok: true`
- `/api/v1/items` 返回 `ok: true` 且 `data.items` 非空
