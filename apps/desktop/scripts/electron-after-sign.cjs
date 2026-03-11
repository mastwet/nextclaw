const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { notarize } = require("@electron/notarize");

function resolveAppleApiKeyFile() {
  const keyPathFromEnv = (process.env.APPLE_API_KEY_PATH || "").trim();
  if (keyPathFromEnv) {
    return { keyPath: keyPathFromEnv, cleanup: null };
  }

  const rawValue = (process.env.APPLE_API_KEY || "").trim();
  if (!rawValue) {
    return { keyPath: "", cleanup: null };
  }

  if (rawValue.includes("BEGIN PRIVATE KEY")) {
    const tmpKeyPath = path.join(
      os.tmpdir(),
      `nextclaw-notary-${Date.now()}-${Math.random().toString(16).slice(2)}.p8`
    );
    fs.writeFileSync(tmpKeyPath, rawValue, { mode: 0o600 });
    return {
      keyPath: tmpKeyPath,
      cleanup: () => {
        fs.rmSync(tmpKeyPath, { force: true });
      }
    };
  }

  return { keyPath: rawValue, cleanup: null };
}

module.exports = async (context) => {
  const platform = String(context?.electronPlatformName || "");
  if (platform !== "darwin") {
    return;
  }

  const appleApiKeyId = (process.env.APPLE_API_KEY_ID || "").trim();
  const appleApiIssuer = (process.env.APPLE_API_ISSUER || "").trim();
  const { keyPath: appleApiKey, cleanup } = resolveAppleApiKeyFile();
  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );

  if (!appleApiKeyId || !appleApiIssuer || !appleApiKey) {
    console.warn(
      "[desktop-after-sign] skip notarization: missing APPLE_API_KEY_ID / APPLE_API_ISSUER / APPLE_API_KEY."
    );
    return;
  }

  if (!fs.existsSync(appPath)) {
    console.warn(`[desktop-after-sign] skip notarization: app not found at ${appPath}`);
    return;
  }

  console.log(`[desktop-after-sign] notarizing ${appPath}`);
  try {
    await notarize({
      appPath,
      appleApiKey,
      appleApiKeyId,
      appleApiIssuer,
      tool: "notarytool"
    });
    console.log("[desktop-after-sign] notarization completed.");
  } finally {
    if (cleanup) {
      cleanup();
    }
  }
};
