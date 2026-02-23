import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function fail(message) {
  throw new Error(message);
}

function expectNonEmptyString(value, path) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function expectStringArray(value, path) {
  if (!Array.isArray(value)) {
    fail(`${path} must be an array`);
  }
  return value.map((entry, index) => expectNonEmptyString(entry, `${path}[${index}]`));
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const catalogPath = resolve(scriptDir, "../data/catalog.json");
const raw = readFileSync(catalogPath, "utf8");
const catalog = JSON.parse(raw);

if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
  fail("catalog root must be an object");
}

const version = expectNonEmptyString(catalog.version, "catalog.version");
const generatedAt = expectNonEmptyString(catalog.generatedAt, "catalog.generatedAt");
if (Number.isNaN(Date.parse(generatedAt))) {
  fail("catalog.generatedAt must be a valid datetime string");
}

if (!Array.isArray(catalog.items)) {
  fail("catalog.items must be an array");
}
if (!Array.isArray(catalog.recommendations)) {
  fail("catalog.recommendations must be an array");
}

const supportedKinds = new Set(["npm", "clawhub", "git", "builtin"]);
const supportedTypes = new Set(["plugin", "skill"]);
const seenIds = new Set();
const seenSlugs = new Set();
const seenSpecs = new Set();

for (let index = 0; index < catalog.items.length; index += 1) {
  const item = catalog.items[index];
  const path = `catalog.items[${index}]`;
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    fail(`${path} must be an object`);
  }

  const id = expectNonEmptyString(item.id, `${path}.id`);
  const slug = expectNonEmptyString(item.slug, `${path}.slug`);
  const type = expectNonEmptyString(item.type, `${path}.type`);
  if (!supportedTypes.has(type)) {
    fail(`${path}.type is invalid`);
  }

  expectNonEmptyString(item.name, `${path}.name`);
  expectNonEmptyString(item.summary, `${path}.summary`);
  expectStringArray(item.tags, `${path}.tags`);
  expectNonEmptyString(item.author, `${path}.author`);
  expectNonEmptyString(item.publishedAt, `${path}.publishedAt`);
  expectNonEmptyString(item.updatedAt, `${path}.updatedAt`);

  if (seenIds.has(id)) {
    fail(`${path}.id duplicates with ${id}`);
  }
  seenIds.add(id);

  if (seenSlugs.has(slug)) {
    fail(`${path}.slug duplicates with ${slug}`);
  }
  seenSlugs.add(slug);

  const install = item.install;
  if (!install || typeof install !== "object" || Array.isArray(install)) {
    fail(`${path}.install must be an object`);
  }

  const kind = expectNonEmptyString(install.kind, `${path}.install.kind`);
  if (!supportedKinds.has(kind)) {
    fail(`${path}.install.kind is invalid`);
  }

  const spec = expectNonEmptyString(install.spec, `${path}.install.spec`);
  expectNonEmptyString(install.command, `${path}.install.command`);

  const specKey = `${type}:${kind}:${spec}`.toLowerCase();
  if (seenSpecs.has(specKey)) {
    fail(`${path}.install.spec duplicates with ${type}/${kind}/${spec}`);
  }
  seenSpecs.add(specKey);
}

for (let index = 0; index < catalog.recommendations.length; index += 1) {
  const recommendation = catalog.recommendations[index];
  const path = `catalog.recommendations[${index}]`;
  if (!recommendation || typeof recommendation !== "object" || Array.isArray(recommendation)) {
    fail(`${path} must be an object`);
  }

  expectNonEmptyString(recommendation.id, `${path}.id`);
  expectNonEmptyString(recommendation.title, `${path}.title`);
  const itemIds = expectStringArray(recommendation.itemIds, `${path}.itemIds`);
  for (const itemId of itemIds) {
    if (!seenIds.has(itemId)) {
      fail(`${path}.itemIds contains unknown item id: ${itemId}`);
    }
  }
}

console.log(`catalog validation passed: version=${version}, items=${catalog.items.length}, recommendations=${catalog.recommendations.length}`);
