/**
 * Extract AWS resource values from amplify_outputs.json and append them
 * as NEXT_PUBLIC_* environment variables to .env.production.
 *
 * Run AFTER `npx ampx generate outputs` and BEFORE `npm run build`.
 *
 * Mapping:
 *   amplify_outputs.json path           → env var
 *   ─────────────────────────────────── → ──────────────────────────────────
 *   auth.aws_region                     → NEXT_PUBLIC_COGNITO_REGION
 *   auth.user_pool_id                   → NEXT_PUBLIC_COGNITO_USER_POOL_ID
 *   auth.user_pool_client_id            → NEXT_PUBLIC_COGNITO_CLIENT_ID
 *   auth.identity_pool_id              → NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID
 *   data.url                            → NEXT_PUBLIC_APPSYNC_ENDPOINT
 *   storage.bucket_name                 → NEXT_PUBLIC_S3_BUCKET_NAME
 *   storage.aws_region                  → NEXT_PUBLIC_S3_REGION
 */

import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const OUTPUTS_FILE = resolve(process.cwd(), 'amplify_outputs.json');
const ENV_FILE = resolve(process.cwd(), '.env.production');

if (!existsSync(OUTPUTS_FILE)) {
  console.error(`[extract-amplify-env] ${OUTPUTS_FILE} not found. Run "npx ampx generate outputs" first.`);
  process.exit(1);
}

const outputs = JSON.parse(readFileSync(OUTPUTS_FILE, 'utf-8'));

/** @type {Array<[string, string | undefined]>} */
const mappings = [
  ['NEXT_PUBLIC_COGNITO_REGION', outputs.auth?.aws_region],
  ['NEXT_PUBLIC_COGNITO_USER_POOL_ID', outputs.auth?.user_pool_id],
  ['NEXT_PUBLIC_COGNITO_CLIENT_ID', outputs.auth?.user_pool_client_id],
  ['NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID', outputs.auth?.identity_pool_id],
  ['NEXT_PUBLIC_APPSYNC_ENDPOINT', outputs.data?.url],
  ['NEXT_PUBLIC_S3_BUCKET_NAME', outputs.storage?.bucket_name],
  ['NEXT_PUBLIC_S3_REGION', outputs.storage?.aws_region],
];

const missing = mappings.filter(([, value]) => !value).map(([key]) => key);
if (missing.length > 0) {
  console.warn(`[extract-amplify-env] Warning: could not resolve values for: ${missing.join(', ')}`);
}

const lines = mappings
  .filter(([, value]) => value)
  .map(([key, value]) => `${key}=${value}`);

if (lines.length === 0) {
  console.error('[extract-amplify-env] No values extracted. Check amplify_outputs.json structure.');
  process.exit(1);
}

appendFileSync(ENV_FILE, '\n# Auto-extracted from amplify_outputs.json\n' + lines.join('\n') + '\n');
console.log(`[extract-amplify-env] Wrote ${lines.length} env vars to .env.production`);
lines.forEach((line) => console.log(`  ${line.split('=')[0]}=***`));
