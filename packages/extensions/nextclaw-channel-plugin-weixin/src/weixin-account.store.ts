import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getDataDir } from "@nextclaw/core";

export type StoredWeixinAccount = {
  accountId: string;
  token: string;
  baseUrl?: string;
  userId?: string;
  savedAt: string;
};

function resolveWeixinDataDir(): string {
  return join(getDataDir(), "channels", "weixin");
}

function resolveAccountsDir(): string {
  return join(resolveWeixinDataDir(), "accounts");
}

function resolveCursorsDir(): string {
  return join(resolveWeixinDataDir(), "cursors");
}

function toAccountFileName(accountId: string): string {
  return `${encodeURIComponent(accountId)}.json`;
}

function readJsonFile<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function saveWeixinAccount(account: StoredWeixinAccount): void {
  mkdirSync(resolveAccountsDir(), { recursive: true });
  const filePath = join(resolveAccountsDir(), toAccountFileName(account.accountId));
  writeFileSync(filePath, JSON.stringify(account, null, 2));
}

export function loadWeixinAccount(accountId: string): StoredWeixinAccount | null {
  return readJsonFile<StoredWeixinAccount>(join(resolveAccountsDir(), toAccountFileName(accountId)));
}

export function deleteWeixinAccount(accountId: string): void {
  rmSync(join(resolveAccountsDir(), toAccountFileName(accountId)), { force: true });
}

export function listStoredWeixinAccountIds(): string[] {
  if (!existsSync(resolveAccountsDir())) {
    return [];
  }
  return readdirSync(resolveAccountsDir())
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => decodeURIComponent(entry.slice(0, -5)))
    .filter(Boolean);
}

export function loadWeixinCursor(accountId: string): string | undefined {
  const payload = readJsonFile<{ cursor?: string }>(join(resolveCursorsDir(), toAccountFileName(accountId)));
  return payload?.cursor?.trim() || undefined;
}

export function saveWeixinCursor(accountId: string, cursor: string | undefined): void {
  mkdirSync(resolveCursorsDir(), { recursive: true });
  const filePath = join(resolveCursorsDir(), toAccountFileName(accountId));
  writeFileSync(filePath, JSON.stringify({ cursor: cursor ?? "" }, null, 2));
}

export function deleteWeixinCursor(accountId: string): void {
  rmSync(join(resolveCursorsDir(), toAccountFileName(accountId)), { force: true });
}
