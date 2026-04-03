/**
 * Postinstall script to fix CVEs in bundled fast-xml-parser dependencies.
 *
 * @aws-amplify/data-construct and @aws-amplify/graphql-api-construct ship
 * fast-xml-parser 4.4.1 as a bundled dependency (inside the package tarball).
 * npm overrides cannot replace bundled dependencies, so this script copies the
 * hoisted (patched) fast-xml-parser into every nested copy that is still
 * vulnerable.
 *
 * Vulnerabilities:
 *  - CVE-2026-26278 / GHSA-jmr7-xgp7-cmfj — DoS through entity expansion in
 *    DOCTYPE (no expansion limit). Fixed in fast-xml-parser >= 4.5.4.
 *  - CVE-2026-33036 / GHSA-8gc5-j5rx-235r — Numeric entity expansion bypassing
 *    all entity expansion limits (incomplete fix for CVE-2026-26278).
 *    Fixed in fast-xml-parser >= 4.5.5.
 *  - GHSA-jp2q-39xq-3w4g — Entity expansion limits bypassed when set to zero
 *    due to JavaScript falsy evaluation. Fixed in fast-xml-parser >= 5.5.7.
 *  - GHSA-m7jm-9gc2-mpf2 — Entity encoding bypass via regex injection in
 *    DOCTYPE entity names. Fixed in fast-xml-parser >= 4.5.4.
 *  - GHSA-fj3w-jwp8-x2g3 — Stack overflow in XMLBuilder with preserveOrder.
 *    Fixed in fast-xml-parser >= 4.5.4.
 */

const fs = require('fs');
const path = require('path');

const MINIMUM_SAFE_VERSION = '5.5.7';

/**
 * Compare two semver-style version strings (e.g. "4.4.1" vs "4.5.4").
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
 * Recursively find all directories named "fast-xml-parser" under `dir`.
 */
function findFastXmlParserDirs(dir, results) {
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
    if (entry.name === 'fast-xml-parser') {
      results.push(fullPath);
    } else if (entry.name === 'node_modules') {
      // Descend into any node_modules directory
      findFastXmlParserDirs(fullPath, results);
    } else if (entry.name.startsWith('@')) {
      // Scoped package directory (e.g. @aws-amplify) — check its children
      findFastXmlParserDirs(fullPath, results);
    } else {
      // Regular package directory — only look for node_modules inside it
      const nested = path.join(fullPath, 'node_modules');
      if (fs.existsSync(nested)) {
        findFastXmlParserDirs(nested, results);
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
  const hoistedDir = path.join(nodeModules, 'fast-xml-parser');

  // Read the hoisted (override-resolved) version
  let hoistedPkg;
  try {
    hoistedPkg = JSON.parse(
      fs.readFileSync(path.join(hoistedDir, 'package.json'), 'utf8')
    );
  } catch {
    // No hoisted fast-xml-parser — nothing to do
    return;
  }

  if (isVersionBelow(hoistedPkg.version, MINIMUM_SAFE_VERSION)) {
    console.warn(
      `[fix-bundled-fast-xml-parser] Hoisted fast-xml-parser ${hoistedPkg.version} is still vulnerable. Skipping.`
    );
    return;
  }

  // Find every nested copy of fast-xml-parser
  const allDirs = findFastXmlParserDirs(nodeModules);
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

    if (!isVersionBelow(nestedPkg.version, MINIMUM_SAFE_VERSION)) continue;

    console.log(
      `[fix-bundled-fast-xml-parser] Replacing ${dir} (${nestedPkg.version} → ${hoistedPkg.version})`
    );

    // Remove old copy and replace with patched version
    fs.rmSync(dir, { recursive: true, force: true });
    copyDirSync(hoistedDir, dir);
    patchedCount++;
  }

  if (patchedCount > 0) {
    console.log(
      `[fix-bundled-fast-xml-parser] Patched ${patchedCount} bundled copies to ${hoistedPkg.version}`
    );
  }
}

main();
