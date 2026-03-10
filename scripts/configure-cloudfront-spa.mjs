/**
 * Configure CloudFront custom error responses for SPA deep-linking.
 *
 * With Next.js `output: 'export'` and `trailingSlash: true`, static routes
 * generate directory-based HTML files (e.g., /login/index.html) that S3 can
 * serve. However, dynamic routes like /plants/{id} don't have pre-generated
 * files for every possible ID.
 *
 * This script configures CloudFront to serve /404.html (the smart not-found
 * page) for 403 and 404 errors with a 200 response code. The not-found page
 * then handles client-side routing for known dynamic route patterns.
 *
 * Required environment variables:
 *   CF_DIST_ID  – CloudFront distribution ID
 *
 * Usage in amplify.yml:
 *   - node scripts/configure-cloudfront-spa.mjs
 */

import { execSync } from 'node:child_process';

const CF_DIST_ID = process.env.CF_DIST_ID;

if (!CF_DIST_ID) {
  console.error('[configure-cloudfront-spa] ERROR: CF_DIST_ID environment variable is not set.');
  process.exit(1);
}

console.log(`[configure-cloudfront-spa] Configuring CloudFront distribution: ${CF_DIST_ID}`);

// --- 1. Fetch current distribution config ---

const rawConfig = execSync(
  `aws cloudfront get-distribution-config --id ${CF_DIST_ID} --output json`,
  { encoding: 'utf-8' }
);

const parsed = JSON.parse(rawConfig);
const etag = parsed.ETag;
const distConfig = parsed.DistributionConfig;

console.log(`[configure-cloudfront-spa] Current ETag: ${etag}`);

// --- 2. Set custom error responses for SPA routing ---

distConfig.CustomErrorResponses = {
  Quantity: 2,
  Items: [
    {
      ErrorCode: 403,
      ResponsePagePath: '/404.html',
      ResponseCode: '200',
      ErrorCachingMinTTL: 0,
    },
    {
      ErrorCode: 404,
      ResponsePagePath: '/404.html',
      ResponseCode: '200',
      ErrorCachingMinTTL: 0,
    },
  ],
};

// --- 3. Write updated config to temp file and update distribution ---

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const tmpFile = resolve(tmpdir(), 'cf-dist-config.json');
writeFileSync(tmpFile, JSON.stringify(distConfig, null, 2), 'utf-8');

console.log('[configure-cloudfront-spa] Updating distribution with custom error responses...');

execSync(
  `aws cloudfront update-distribution --id ${CF_DIST_ID} --distribution-config file://${tmpFile} --if-match ${etag}`,
  { encoding: 'utf-8', stdio: 'inherit' }
);

console.log('[configure-cloudfront-spa] CloudFront distribution updated successfully.');
console.log('[configure-cloudfront-spa] Custom error responses:');
console.log('  403 → /404.html (200)');
console.log('  404 → /404.html (200)');
