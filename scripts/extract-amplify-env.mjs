/**
 * Extract AWS resource values from amplify_outputs.json and write them
 * as NEXT_PUBLIC_* environment variables to .env.production and .env.amplify
 * (a shell-sourceable file for exporting into the build environment).
 *
 * Run AFTER `npx ampx generate outputs` and BEFORE `npm run build`.
 *
 * Usage in amplify.yml:
 *   - node scripts/extract-amplify-env.mjs
 *   - source .env.amplify           # export vars into shell
 *   - npm run build                  # Next.js inlines NEXT_PUBLIC_* at build time
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const OUTPUTS_FILE = resolve(process.cwd(), 'amplify_outputs.json');
const ENV_PROD_FILE = resolve(process.cwd(), '.env.production');
const ENV_SHELL_FILE = resolve(process.cwd(), '.env.amplify');

// --- 1. Read amplify_outputs.json ---

if (!existsSync(OUTPUTS_FILE)) {
  console.error(`[extract-amplify-env] ERROR: ${OUTPUTS_FILE} not found.`);
  console.error('  Run "npx ampx generate outputs" first.');
  process.exit(1);
}

let outputs;
try {
  const raw = readFileSync(OUTPUTS_FILE, 'utf-8');
  outputs = JSON.parse(raw);
  console.log(`[extract-amplify-env] Loaded amplify_outputs.json (version: ${outputs.version ?? 'unknown'})`);
  console.log(`[extract-amplify-env] Top-level keys: ${Object.keys(outputs).join(', ')}`);
} catch (err) {
  console.error(`[extract-amplify-env] ERROR: Failed to parse amplify_outputs.json: ${err.message}`);
  process.exit(1);
}

// --- 2. Map outputs to NEXT_PUBLIC_* env vars ---

/** @type {Array<[string, string | undefined]>} */
const mappings = [
  ['NEXT_PUBLIC_COGNITO_REGION',          outputs.auth?.aws_region],
  ['NEXT_PUBLIC_COGNITO_USER_POOL_ID',    outputs.auth?.user_pool_id],
  ['NEXT_PUBLIC_COGNITO_CLIENT_ID',       outputs.auth?.user_pool_client_id],
  ['NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID', outputs.auth?.identity_pool_id],
  ['NEXT_PUBLIC_APPSYNC_ENDPOINT',        outputs.data?.url],
  ['NEXT_PUBLIC_S3_BUCKET_NAME',          outputs.storage?.bucket_name],
  ['NEXT_PUBLIC_S3_REGION',               outputs.storage?.aws_region],
];

const resolved = mappings.filter(([, value]) => value);
const missing = mappings.filter(([, value]) => !value).map(([key]) => key);

if (missing.length > 0) {
  console.warn(`[extract-amplify-env] WARNING: Could not resolve: ${missing.join(', ')}`);
  console.warn(`[extract-amplify-env]   auth keys: ${JSON.stringify(outputs.auth ? Object.keys(outputs.auth) : 'N/A')}`);
  console.warn(`[extract-amplify-env]   data keys: ${JSON.stringify(outputs.data ? Object.keys(outputs.data) : 'N/A')}`);
  console.warn(`[extract-amplify-env]   storage keys: ${JSON.stringify(outputs.storage ? Object.keys(outputs.storage) : 'N/A')}`);
}

if (resolved.length === 0) {
  console.error('[extract-amplify-env] ERROR: No values extracted. Check amplify_outputs.json structure.');
  process.exit(1);
}

// --- 3. Write .env.production (Next.js loads this during `next build`) ---

const envLines = resolved.map(([key, value]) => `${key}=${value}`);
const envContent = '\n# Auto-extracted from amplify_outputs.json\n' + envLines.join('\n') + '\n';

// Read existing content to avoid duplicates, then append
const existing = existsSync(ENV_PROD_FILE) ? readFileSync(ENV_PROD_FILE, 'utf-8') : '';
writeFileSync(ENV_PROD_FILE, existing + envContent, 'utf-8');

// --- 4. Write .env.amplify (shell-sourceable, for `source .env.amplify`) ---

const shellLines = resolved.map(([key, value]) => `export ${key}="${value}"`);
writeFileSync(ENV_SHELL_FILE, shellLines.join('\n') + '\n', 'utf-8');

// --- 5. Summary ---

console.log(`[extract-amplify-env] Wrote ${resolved.length} env vars to .env.production`);
console.log(`[extract-amplify-env] Wrote ${resolved.length} env vars to .env.amplify (shell-sourceable)`);
resolved.forEach(([key]) => console.log(`  ✓ ${key}`));
