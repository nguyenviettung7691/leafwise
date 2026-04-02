/**
 * Postinstall script to fix CVE-2026-4800 in bundled lodash dependencies.
 *
 * @aws-amplify/data-construct and @aws-amplify/graphql-api-construct ship
 * lodash 4.17.21 as a bundled dependency (inside the package tarball).
 * npm overrides cannot replace bundled dependencies, so this script copies the
 * hoisted (patched) lodash into every nested copy that is still vulnerable.
 *
 * Vulnerability: CVE-2026-4800 — Code Injection via _.template imports key
 * names. Fixed in lodash >= 4.18.0.
 */

const fs = require('fs');
const path = require('path');

const MINIMUM_SAFE_VERSION = '4.18.0';

/**
 * Compare two semver-style version strings (e.g. "4.17.21" vs "4.18.0").
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
 * Recursively find all directories named "lodash" under `dir`.
 */
function findLodashDirs(dir, results) {
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
    if (entry.name === 'lodash') {
      results.push(fullPath);
    } else if (entry.name === 'node_modules') {
      // Descend into any node_modules directory
      findLodashDirs(fullPath, results);
    } else if (entry.name.startsWith('@')) {
      // Scoped package directory (e.g. @aws-amplify) — check its children
      findLodashDirs(fullPath, results);
    } else {
      // Regular package directory — only look for node_modules inside it
      const nested = path.join(fullPath, 'node_modules');
      if (fs.existsSync(nested)) {
        findLodashDirs(nested, results);
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
  const hoistedDir = path.join(nodeModules, 'lodash');

  // Read the hoisted (override-resolved) version
  let hoistedPkg;
  try {
    hoistedPkg = JSON.parse(
      fs.readFileSync(path.join(hoistedDir, 'package.json'), 'utf8')
    );
  } catch {
    // No hoisted lodash — nothing to do
    return;
  }

  if (isVersionBelow(hoistedPkg.version, MINIMUM_SAFE_VERSION)) {
    console.warn(
      `[fix-bundled-lodash] Hoisted lodash ${hoistedPkg.version} is still vulnerable. Skipping.`
    );
    return;
  }

  // Find every nested copy of lodash
  const allDirs = findLodashDirs(nodeModules);
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

    // Only patch the actual lodash package, not @types/lodash or similar
    if (nestedPkg.name !== 'lodash') continue;

    if (!isVersionBelow(nestedPkg.version, MINIMUM_SAFE_VERSION)) continue;

    console.log(
      `[fix-bundled-lodash] Replacing ${dir} (${nestedPkg.version} → ${hoistedPkg.version})`
    );

    // Remove old copy and replace with patched version
    fs.rmSync(dir, { recursive: true, force: true });
    copyDirSync(hoistedDir, dir);
    patchedCount++;
  }

  if (patchedCount > 0) {
    console.log(
      `[fix-bundled-lodash] Patched ${patchedCount} bundled copies to ${hoistedPkg.version}`
    );
  }
}

main();
