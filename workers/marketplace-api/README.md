# Marketplace API Worker (Read-only)

Cloudflare Worker + Hono 的只读 Marketplace API，用于插件与 Skill 的列表、分页搜索、详情与推荐查询。

## 本地开发

```bash
pnpm -C workers/marketplace-api install
pnpm -C workers/marketplace-api dev
```

## 质量检查

```bash
pnpm -C workers/marketplace-api build
pnpm -C workers/marketplace-api lint
pnpm -C workers/marketplace-api tsc
```

## 部署与同步

### GitHub Actions 自动同步（推荐）

- 数据源固定为仓库文件：`workers/marketplace-api/data/catalog.json`
- 当 `catalog.json` 或 `workers/marketplace-api` 相关代码变更并合入 `master/main` 后，
  `Marketplace Catalog Sync` workflow 会自动执行：
  - catalog 校验
  - build/lint/tsc
  - deploy 到 Cloudflare Worker
  - 线上 smoke check

需要在仓库 Secrets 配置：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### 手动部署（兜底）

```bash
pnpm -C workers/marketplace-api run deploy
```

## 凭证

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

或使用本地 wrangler 登录态。

## 数据来源

- 当前数据文件：`workers/marketplace-api/data/catalog.json`
- 当前模式：数据随 Worker 代码一起发布（GitHub Actions 自动同步，手动部署兜底）
