/**
 * Postinstall script to fix GHSA-6475-r3vj-m8vf in bundled @smithy/config-resolver.
 *
 * @aws-amplify/data-construct and @aws-amplify/graphql-api-construct ship
 * @smithy/config-resolver as a bundled dependency (inside the package tarball).
 * npm overrides cannot replace bundled dependencies, so this script copies the
 * hoisted (patched) @smithy/config-resolver into every nested copy that is
 * still vulnerable.
 *
 * Vulnerability: GHSA-6475-r3vj-m8vf — AWS SDK for JavaScript v3 defense in
 * depth enhancement for region parameter value. Fixed in
 * @smithy/config-resolver >= 4.4.0.
 */

const fs = require('fs');
const path = require('path');

const MINIMUM_SAFE_VERSION = '4.4.0';

/**
 * Compare two semver-style version strings (e.g. "4.1.0" vs "4.4.0").
 * Returns true when `version` is strictly less than `minimum`.
 */
function isVersionBelow(version, minimum) {
  const a = version.split('.').map(Number);
  const b = minimum.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av < bv) return true;
    if (av > bv) return false;
  }
  return false;
}

/**
 * Recursively find all directories that are @smithy/config-resolver packages
 * under `dir`. Handles the scoped package directory structure
 * (node_modules/@smithy/config-resolver).
 */
function findConfigResolverDirs(dir, results) {
  results = results || [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.name === '@smithy') {
      // Check for config-resolver inside @smithy scope
      const configResolverPath = path.join(fullPath, 'config-resolver');
      if (fs.existsSync(configResolverPath)) {
        results.push(configResolverPath);
      }
      // Also descend into other @smithy packages that may have nested node_modules
      let smithyEntries;
      try {
        smithyEntries = fs.readdirSync(fullPath, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const smithyEntry of smithyEntries) {
        if (!smithyEntry.isDirectory() || smithyEntry.name === 'config-resolver') continue;
        const nested = path.join(fullPath, smithyEntry.name, 'node_modules');
        if (fs.existsSync(nested)) {
          findConfigResolverDirs(nested, results);
        }
      }
    } else if (entry.name === 'node_modules') {
      findConfigResolverDirs(fullPath, results);
    } else if (entry.name.startsWith('@')) {
      // Other scoped package directories — check their children
      findConfigResolverDirs(fullPath, results);
    } else {
      // Regular package directory — only look for node_modules inside it
      const nested = path.join(fullPath, 'node_modules');
      if (fs.existsSync(nested)) {
        findConfigResolverDirs(nested, results);
      }
    }
  }
  return results;
}

/**
 * Recursively copy `src` directory to `dest`, overwriting existing files.
 */
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  const nodeModules = path.resolve(__dirname, '..', 'node_modules');
  const hoistedDir = path.join(nodeModules, '@smithy', 'config-resolver');

  // Read the hoisted (override-resolved) version
  let hoistedPkg;
  try {
    hoistedPkg = JSON.parse(
      fs.readFileSync(path.join(hoistedDir, 'package.json'), 'utf8')
    );
  } catch {
    // No hoisted @smithy/config-resolver — nothing to do
    return;
  }

  if (isVersionBelow(hoistedPkg.version, MINIMUM_SAFE_VERSION)) {
    console.warn(
      `[fix-bundled-smithy-config-resolver] Hoisted @smithy/config-resolver ${hoistedPkg.version} is still vulnerable. Skipping.`
    );
    return;
  }

  // Find every nested copy of @smithy/config-resolver
  const allDirs = findConfigResolverDirs(nodeModules);
  let patchedCount = 0;

  for (const dir of allDirs) {
    if (dir === hoistedDir) continue;

    let nestedPkg;
    try {
      nestedPkg = JSON.parse(
        fs.readFileSync(path.join(dir, 'package.json'), 'utf8')
      );
    } catch {
      continue;
    }

    // Only patch @smithy/config-resolver packages
    if (nestedPkg.name !== '@smithy/config-resolver') continue;

    if (!isVersionBelow(nestedPkg.version, MINIMUM_SAFE_VERSION)) continue;

    console.log(
      `[fix-bundled-smithy-config-resolver] Replacing ${dir} (${nestedPkg.version} → ${hoistedPkg.version})`
    );

    // Remove old copy and replace with patched version
    fs.rmSync(dir, { recursive: true, force: true });
    copyDirSync(hoistedDir, dir);
    patchedCount++;
  }

  if (patchedCount > 0) {
    console.log(
      `[fix-bundled-smithy-config-resolver] Patched ${patchedCount} bundled copies to ${hoistedPkg.version}`
    );
  }
}

main();
