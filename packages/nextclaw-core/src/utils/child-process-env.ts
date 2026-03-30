const DEVELOPMENT_CONDITION_PATTERN = /(^|\s)--conditions(?:=|\s+)development(?=\s|$)/g;

export function sanitizeNodeOptionsForExternalCommand(nodeOptions?: string): string | undefined {
  if (typeof nodeOptions !== "string") {
    return undefined;
  }
  const sanitized = nodeOptions
    .replace(DEVELOPMENT_CONDITION_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized || undefined;
}

export function createExternalCommandEnv(
  baseEnv: NodeJS.ProcessEnv = process.env,
  extraEnv: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv {
  const env = { ...baseEnv, ...extraEnv };
  const sanitizedNodeOptions = sanitizeNodeOptionsForExternalCommand(env.NODE_OPTIONS);
  if (sanitizedNodeOptions) {
    env.NODE_OPTIONS = sanitizedNodeOptions;
  } else {
    delete env.NODE_OPTIONS;
  }
  return env;
}
