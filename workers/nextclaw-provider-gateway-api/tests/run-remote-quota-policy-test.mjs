import { copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");

await Promise.all([
  copyFile(join(distDir, "remote-quota-contract.js"), join(distDir, "remote-quota-contract")),
  copyFile(join(distDir, "remote-quota-budget-support.js"), join(distDir, "remote-quota-budget-support")),
  copyFile(join(distDir, "remote-quota-state-support.js"), join(distDir, "remote-quota-state-support")),
  copyFile(join(distDir, "remote-quota-summary-support.js"), join(distDir, "remote-quota-summary-support")),
  copyFile(join(distDir, "remote-quota-policy.js"), join(distDir, "remote-quota-policy"))
]);

const child = spawn(process.execPath, ["--test", join(__dirname, "remote-quota-policy.test.mjs")], {
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
