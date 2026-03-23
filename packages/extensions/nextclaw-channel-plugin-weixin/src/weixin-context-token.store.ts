const contextTokens = new Map<string, string>();

function buildContextTokenKey(accountId: string, userId: string): string {
  return `${accountId}:${userId}`;
}

export function setWeixinContextToken(accountId: string, userId: string, contextToken: string): void {
  const trimmedToken = contextToken.trim();
  if (!trimmedToken) {
    return;
  }
  contextTokens.set(buildContextTokenKey(accountId, userId), trimmedToken);
}

export function getWeixinContextToken(accountId: string, userId: string): string | undefined {
  return contextTokens.get(buildContextTokenKey(accountId, userId));
}
