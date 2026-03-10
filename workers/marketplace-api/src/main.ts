import { Hono, type Context } from "hono";
import { GetPluginItemUseCase } from "./application/plugins/get-plugin-item.usecase";
import { ListPluginItemsUseCase } from "./application/plugins/list-plugin-items.usecase";
import { ListPluginRecommendationsUseCase } from "./application/plugins/list-plugin-recommendations.usecase";
import { GetSkillItemUseCase } from "./application/skills/get-skill-item.usecase";
import { ListSkillItemsUseCase } from "./application/skills/list-skill-items.usecase";
import { ListSkillRecommendationsUseCase } from "./application/skills/list-skill-recommendations.usecase";
import { DomainValidationError, ResourceNotFoundError } from "./domain/errors";
import type { MarketplaceItem } from "./domain/model";
import { D1MarketplacePluginDataSource, D1MarketplaceSkillDataSource } from "./infrastructure/d1-data-source";
import { InMemoryPluginRepository } from "./infrastructure/in-memory-plugin-repository";
import { InMemorySkillRepository } from "./infrastructure/in-memory-skill-repository";
import { MarketplaceQueryParser } from "./presentation/http/query-parser";
import { ApiResponseFactory } from "./presentation/http/response";

type MarketplaceBindings = {
  MARKETPLACE_SKILLS_DB: D1Database;
  MARKETPLACE_PLUGINS_DB: D1Database;
  MARKETPLACE_CACHE_TTL_SECONDS?: string;
  MARKETPLACE_ADMIN_TOKEN?: string;
};

type MarketplaceEnv = {
  Bindings: MarketplaceBindings;
};

class MarketplaceAuthError extends Error {}

class MarketplaceRuntime {
  readonly responses = new ApiResponseFactory();
  readonly parser = new MarketplaceQueryParser();
  readonly pluginDataSource: D1MarketplacePluginDataSource;
  readonly skillDataSource: D1MarketplaceSkillDataSource;

  readonly pluginRepository: InMemoryPluginRepository;
  readonly listPluginItems: ListPluginItemsUseCase;
  readonly getPluginItem: GetPluginItemUseCase;
  readonly listPluginRecommendations: ListPluginRecommendationsUseCase;

  readonly skillRepository: InMemorySkillRepository;
  readonly listSkillItems: ListSkillItemsUseCase;
  readonly getSkillItem: GetSkillItemUseCase;
  readonly listSkillRecommendations: ListSkillRecommendationsUseCase;

  constructor(bindings: MarketplaceBindings) {
    this.pluginDataSource = new D1MarketplacePluginDataSource(bindings.MARKETPLACE_PLUGINS_DB);
    this.skillDataSource = new D1MarketplaceSkillDataSource(bindings.MARKETPLACE_SKILLS_DB);
    const ttlSeconds = this.parseCacheTtlSeconds(bindings.MARKETPLACE_CACHE_TTL_SECONDS);

    this.pluginRepository = new InMemoryPluginRepository(this.pluginDataSource, {
      cacheTtlMs: ttlSeconds * 1000
    });
    this.listPluginItems = new ListPluginItemsUseCase(this.pluginRepository);
    this.getPluginItem = new GetPluginItemUseCase(this.pluginRepository);
    this.listPluginRecommendations = new ListPluginRecommendationsUseCase(this.pluginRepository);

    this.skillRepository = new InMemorySkillRepository(this.skillDataSource, {
      cacheTtlMs: ttlSeconds * 1000
    });
    this.listSkillItems = new ListSkillItemsUseCase(this.skillRepository);
    this.getSkillItem = new GetSkillItemUseCase(this.skillRepository);
    this.listSkillRecommendations = new ListSkillRecommendationsUseCase(this.skillRepository);
  }

  invalidateCache(): void {
    this.pluginRepository.invalidateCache();
    this.skillRepository.invalidateCache();
  }

  private parseCacheTtlSeconds(raw: string | undefined): number {
    if (!raw) {
      return 5;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 5;
    }
    return parsed;
  }
}

const responses = new ApiResponseFactory();
const runtimes = new WeakMap<D1Database, WeakMap<D1Database, MarketplaceRuntime>>();

function getRuntime(bindings: MarketplaceBindings): MarketplaceRuntime {
  if (!bindings.MARKETPLACE_PLUGINS_DB) {
    throw new Error("MARKETPLACE_PLUGINS_DB binding is required");
  }
  if (!bindings.MARKETPLACE_SKILLS_DB) {
    throw new Error("MARKETPLACE_SKILLS_DB binding is required");
  }
  const pluginDb = bindings.MARKETPLACE_PLUGINS_DB;
  const skillDb = bindings.MARKETPLACE_SKILLS_DB;
  let bySkill = runtimes.get(pluginDb);
  if (!bySkill) {
    bySkill = new WeakMap();
    runtimes.set(pluginDb, bySkill);
  }
  const cached = bySkill.get(skillDb);
  if (cached) {
    return cached;
  }
  const created = new MarketplaceRuntime(bindings);
  bySkill.set(skillDb, created);
  return created;
}

function requireAdminToken(c: Context<MarketplaceEnv>): void {
  const expected = c.env.MARKETPLACE_ADMIN_TOKEN?.trim();
  if (!expected) {
    return;
  }
  const auth = c.req.header("authorization")?.trim();
  if (auth === `Bearer ${expected}`) {
    return;
  }
  throw new MarketplaceAuthError("missing or invalid admin token");
}

function splitMarkdownFrontmatter(raw: string): { metadataRaw?: string; bodyRaw: string } {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { bodyRaw: normalized };
  }

  return {
    metadataRaw: match[1]?.trim() || undefined,
    bodyRaw: match[2] ?? ""
  };
}

function decodeBase64(raw: string): Uint8Array {
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function pickSkillMarkdown(files: Array<{ path: string; contentBase64: string }>): string | null {
  const skillFile = files.find((file) => file.path === "SKILL.md")
    ?? files.find((file) => file.path.toLowerCase() === "skill.md");
  if (!skillFile) {
    return null;
  }
  return decodeUtf8(decodeBase64(skillFile.contentBase64));
}

function ensureSkillItem(item: MarketplaceItem): void {
  if (item.type !== "skill") {
    throw new ResourceNotFoundError(`skill item not found: ${item.slug}`);
  }
}

const app = new Hono<MarketplaceEnv>();

app.notFound((c) => responses.error(c, "NOT_FOUND", "endpoint not found", 404));

app.onError((error, c) => {
  if (error instanceof ResourceNotFoundError) {
    return responses.error(c, "NOT_FOUND", error.message, 404);
  }

  if (error instanceof DomainValidationError) {
    return responses.error(c, "INVALID_QUERY", error.message, 400);
  }

  if (error instanceof MarketplaceAuthError) {
    return responses.error(c, "UNAUTHORIZED", error.message, 401);
  }

  return responses.error(c, "INTERNAL_ERROR", error.message || "internal error", 500);
});

app.use("/api/v1/*", async (c, next) => {
  const method = c.req.method.toUpperCase();
  const path = c.req.path;
  const isRead = method === "GET" || method === "HEAD";
  const isAdminWrite = method === "POST" && path.startsWith("/api/v1/admin/");

  if (!isRead && !isAdminWrite) {
    return responses.error(c, "READ_ONLY_API", "marketplace api is read-only except /api/v1/admin/*", 405);
  }

  await next();
  return undefined;
});

app.get("/health", (c) => {
  return responses.ok(c, {
    status: "ok",
    service: "marketplace-api",
    storage: "d1",
    databases: ["skills", "plugins"]
  });
});

app.get("/api/v1/plugins/items", async (c) => {
  const runtime = getRuntime(c.env);
  const query = runtime.parser.parseListQuery(c);
  const data = await runtime.listPluginItems.execute(query);
  return runtime.responses.ok(c, data);
});

app.get("/api/v1/plugins/items/:slug", async (c) => {
  const runtime = getRuntime(c.env);
  const data = await runtime.getPluginItem.execute(c.req.param("slug"));
  return runtime.responses.ok(c, data);
});

app.get("/api/v1/plugins/recommendations", async (c) => {
  const runtime = getRuntime(c.env);
  const sceneId = runtime.parser.parseRecommendationScene(c);
  const limit = runtime.parser.parseRecommendationLimit(c);
  const data = await runtime.listPluginRecommendations.execute(sceneId, limit);
  return runtime.responses.ok(c, data);
});

app.get("/api/v1/skills/items", async (c) => {
  const runtime = getRuntime(c.env);
  const query = runtime.parser.parseListQuery(c);
  const data = await runtime.listSkillItems.execute(query);
  return runtime.responses.ok(c, data);
});

app.get("/api/v1/skills/items/:slug", async (c) => {
  const runtime = getRuntime(c.env);
  const data = await runtime.getSkillItem.execute(c.req.param("slug"));
  return runtime.responses.ok(c, data);
});

app.get("/api/v1/skills/items/:slug/files", async (c) => {
  const runtime = getRuntime(c.env);
  const slug = c.req.param("slug");
  const payload = await runtime.skillDataSource.getSkillFilesBySlug(slug);
  if (!payload) {
    throw new ResourceNotFoundError(`skill item not found: ${slug}`);
  }
  ensureSkillItem(payload.item);

  return runtime.responses.ok(c, {
    type: "skill",
    slug: payload.item.slug,
    install: payload.item.install,
    updatedAt: payload.item.updatedAt,
    totalFiles: payload.files.length,
    files: payload.files
  });
});

app.get("/api/v1/skills/items/:slug/content", async (c) => {
  const runtime = getRuntime(c.env);
  const slug = c.req.param("slug");
  const payload = await runtime.skillDataSource.getSkillFilesBySlug(slug);
  if (!payload) {
    throw new ResourceNotFoundError(`skill item not found: ${slug}`);
  }
  ensureSkillItem(payload.item);

  const raw = pickSkillMarkdown(payload.files);
  if (!raw) {
    throw new ResourceNotFoundError(`skill markdown not found: ${slug}`);
  }

  const split = splitMarkdownFrontmatter(raw);
  return runtime.responses.ok(c, {
    type: "skill",
    slug: payload.item.slug,
    name: payload.item.name,
    install: payload.item.install,
    source: payload.item.install.kind,
    raw,
    metadataRaw: split.metadataRaw,
    bodyRaw: split.bodyRaw
  });
});

app.get("/api/v1/skills/recommendations", async (c) => {
  const runtime = getRuntime(c.env);
  const sceneId = runtime.parser.parseRecommendationScene(c);
  const limit = runtime.parser.parseRecommendationLimit(c);
  const data = await runtime.listSkillRecommendations.execute(sceneId, limit);
  return runtime.responses.ok(c, data);
});

app.post("/api/v1/admin/skills/upsert", async (c) => {
  requireAdminToken(c);
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return responses.error(c, "INVALID_BODY", "invalid json body", 400);
  }

  const runtime = getRuntime(c.env);
  const result = await runtime.skillDataSource.upsertSkill(body);
  runtime.invalidateCache();
  return runtime.responses.ok(c, {
    created: result.created,
    item: result.item,
    fileCount: result.fileCount
  });
});

export default app;
