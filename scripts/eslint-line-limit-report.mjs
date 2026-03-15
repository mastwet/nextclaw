#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetRuleIds = new Set(["max-lines", "max-lines-per-function"]);

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const options = {
  json: args.includes("--json"),
  failOnViolations: args.includes("--fail-on-violations")
};

const toPosixPath = (input) => input.split(sep).join("/");

const readJsonFile = (filePath) => JSON.parse(readFileSync(filePath, "utf8"));

const listWorkspacePackageDirs = () => {
  const rootPackage = readJsonFile(resolve(rootDir, "package.json"));
  const workspacePatterns = Array.isArray(rootPackage.workspaces) ? rootPackage.workspaces : [];
  const packageDirs = new Set();

  for (const pattern of workspacePatterns) {
    if (!pattern.includes("*")) {
      const packageDir = resolve(rootDir, pattern);
      if (existsSync(resolve(packageDir, "package.json"))) {
        packageDirs.add(packageDir);
      }
      continue;
    }

    const wildcardIndex = pattern.indexOf("*");
    const basePattern = pattern.slice(0, wildcardIndex).replace(/\/$/, "");
    const baseDir = resolve(rootDir, basePattern);
    if (!existsSync(baseDir) || !statSync(baseDir).isDirectory()) {
      continue;
    }

    for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }
      const packageDir = resolve(baseDir, entry.name);
      if (existsSync(resolve(packageDir, "package.json"))) {
        packageDirs.add(packageDir);
      }
    }
  }

  return Array.from(packageDirs).sort((left, right) => left.localeCompare(right));
};

const hasEslintLintScript = (packageDir) => {
  const packageJson = readJsonFile(resolve(packageDir, "package.json"));
  const lintScript = packageJson.scripts?.lint;
  return typeof lintScript === "string" && lintScript.includes("eslint");
};

const collapseNestedTargets = (packageDirs) => {
  const sortedDirs = [...packageDirs].sort((left, right) => left.length - right.length || left.localeCompare(right));
  const collapsed = [];

  for (const packageDir of sortedDirs) {
    if (collapsed.some((parentDir) => packageDir.startsWith(`${parentDir}${sep}`))) {
      continue;
    }
    collapsed.push(packageDir);
  }

  return collapsed;
};

const detectedPackageDirs = listWorkspacePackageDirs().filter(hasEslintLintScript);
const targetPackageDirs = collapseNestedTargets(detectedPackageDirs);

const detectWorkspace = (absoluteFilePath) => {
  const matchedDir = targetPackageDirs
    .filter((packageDir) => absoluteFilePath === packageDir || absoluteFilePath.startsWith(`${packageDir}${sep}`))
    .sort((left, right) => right.length - left.length)[0];

  if (!matchedDir) {
    return "root";
  }

  return toPosixPath(relative(rootDir, matchedDir));
};

const eslint = new ESLint({
  cwd: rootDir,
  errorOnUnmatchedPattern: false
});

const lintTargets = targetPackageDirs.map((packageDir) => toPosixPath(relative(rootDir, packageDir)));
const results = await eslint.lintFiles(lintTargets);

const violations = [];
const nonTargetErrors = [];

for (const result of results) {
  const relativeFilePath = toPosixPath(relative(rootDir, result.filePath));
  const workspace = detectWorkspace(result.filePath);
  for (const message of result.messages) {
    if (targetRuleIds.has(message.ruleId ?? "")) {
      violations.push({
        workspace,
        filePath: relativeFilePath,
        ruleId: message.ruleId,
        severity: message.severity,
        line: message.line ?? 0,
        column: message.column ?? 0,
        message: message.message
      });
      continue;
    }

    if (message.severity === 2 || message.fatal) {
      nonTargetErrors.push({
        workspace,
        filePath: relativeFilePath,
        ruleId: message.ruleId ?? "fatal",
        line: message.line ?? 0,
        column: message.column ?? 0,
        message: message.message
      });
    }
  }
}

violations.sort((left, right) => {
  if (left.workspace !== right.workspace) {
    return left.workspace.localeCompare(right.workspace);
  }
  if (left.filePath !== right.filePath) {
    return left.filePath.localeCompare(right.filePath);
  }
  if (left.ruleId !== right.ruleId) {
    return left.ruleId.localeCompare(right.ruleId);
  }
  if (left.line !== right.line) {
    return left.line - right.line;
  }
  return left.column - right.column;
});

nonTargetErrors.sort((left, right) => {
  if (left.workspace !== right.workspace) {
    return left.workspace.localeCompare(right.workspace);
  }
  if (left.filePath !== right.filePath) {
    return left.filePath.localeCompare(right.filePath);
  }
  if (left.line !== right.line) {
    return left.line - right.line;
  }
  return left.column - right.column;
});

const violationsByRule = Object.fromEntries(
  [...targetRuleIds]
    .sort((left, right) => left.localeCompare(right))
    .map((ruleId) => [ruleId, violations.filter((violation) => violation.ruleId === ruleId).length])
);

const violationsByWorkspace = Array.from(
  violations.reduce((map, violation) => {
    const current = map.get(violation.workspace) ?? [];
    current.push(violation);
    map.set(violation.workspace, current);
    return map;
  }, new Map())
)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([workspace, workspaceViolations]) => ({
    workspace,
    count: workspaceViolations.length,
    files: Array.from(
      workspaceViolations.reduce((map, violation) => {
        const current = map.get(violation.filePath) ?? [];
        current.push(violation);
        map.set(violation.filePath, current);
        return map;
      }, new Map())
    )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([filePath, fileViolations]) => ({
        filePath,
        count: fileViolations.length,
        violations: fileViolations
      }))
  }));

const report = {
  scannedWorkspaces: targetPackageDirs.map((packageDir) => toPosixPath(relative(rootDir, packageDir))),
  totalViolations: violations.length,
  affectedFiles: new Set(violations.map((violation) => violation.filePath)).size,
  violationsByRule,
  violationsByWorkspace,
  ignoredNonTargetErrors: nonTargetErrors
};

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("ESLint line-limit report");
  console.log(`Scanned workspaces: ${report.scannedWorkspaces.length}`);
  console.log(`Affected files: ${report.affectedFiles}`);
  console.log(`Total violations: ${report.totalViolations}`);
  for (const [ruleId, count] of Object.entries(report.violationsByRule)) {
    console.log(`- ${ruleId}: ${count}`);
  }

  if (report.totalViolations === 0) {
    console.log("");
    console.log("No max-lines or max-lines-per-function violations found.");
  } else {
    for (const workspaceEntry of report.violationsByWorkspace) {
      console.log("");
      console.log(`[${workspaceEntry.workspace}] ${workspaceEntry.count}`);
      for (const fileEntry of workspaceEntry.files) {
        console.log(`  ${fileEntry.filePath} (${fileEntry.count})`);
        for (const violation of fileEntry.violations) {
          console.log(
            `    - ${violation.ruleId} ${violation.line}:${violation.column} ${violation.message}`
          );
        }
      }
    }
  }

  if (report.ignoredNonTargetErrors.length > 0) {
    console.log("");
    console.log(`Ignored non-target ESLint errors: ${report.ignoredNonTargetErrors.length}`);
    for (const issue of report.ignoredNonTargetErrors.slice(0, 20)) {
      console.log(`- ${issue.filePath}:${issue.line}:${issue.column} [${issue.ruleId}] ${issue.message}`);
    }
    if (report.ignoredNonTargetErrors.length > 20) {
      console.log(`- ... ${report.ignoredNonTargetErrors.length - 20} more`);
    }
  }
}

if (options.failOnViolations && report.totalViolations > 0) {
  process.exit(1);
}
