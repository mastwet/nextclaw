import {
  collectWorkspacePackages,
  getExplicitReleaseBatchPackageNames,
  getPackageTagName,
  readMeaningfulReleaseDrift,
  readPendingChangesetPackages
} from "./release-scope.mjs";

const workspacePackages = collectWorkspacePackages();
const pendingChangesetPackages = readPendingChangesetPackages();
const batchPackageNames = getExplicitReleaseBatchPackageNames(
  workspacePackages,
  pendingChangesetPackages
);

const healthDriftFailures = workspacePackages
  .filter((entry) => entry.private === false)
  .filter((entry) => !batchPackageNames.has(entry.pkg.name))
  .map((entry) => ({
    packageName: entry.pkg.name,
    version: entry.pkg.version,
    tagName: getPackageTagName(entry.pkg),
    changedFiles: readMeaningfulReleaseDrift(entry)
  }))
  .filter((entry) => entry.changedFiles.length > 0);

if (healthDriftFailures.length === 0) {
  console.log("Repository release health is clean.");
  process.exit(0);
}

console.warn("Repository release health has unpublished drift outside the current batch.");
for (const failure of healthDriftFailures) {
  console.warn(`- package: ${failure.packageName}@${failure.version}`);
  console.warn(`  tag: ${failure.tagName}`);
  console.warn("  changed files:");
  for (const changedFile of failure.changedFiles) {
    console.warn(`    - ${changedFile}`);
  }
}

process.exit(0);
