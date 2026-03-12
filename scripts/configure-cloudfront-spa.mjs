/**
 * Configure CloudFront for SPA deep-linking with Next.js static export.
 *
 * With Next.js `output: 'export'` and `trailingSlash: true`, pages are
 * generated as directory-based HTML files (e.g., /login/index.html).
 *
 * Two problems arise when deploying to S3 (REST API origin) + CloudFront:
 *
 * 1. **Static routes**: S3 REST API origins return 403 for directory paths
 *    like `/calendar/` because they don't auto-resolve `index.html`.
 *    Fix: A CloudFront Function rewrites URIs to append `index.html`.
 *
 * 2. **Dynamic routes**: Routes like `/plants/{id}` don't have pre-generated
 *    files for every possible ID, so S3 returns 404.
 *    Fix: Custom error responses serve `/404.html` (the smart not-found page)
 *    which renders the correct component client-side.
 *
 * Required environment variables:
 *   CF_DIST_ID  – CloudFront distribution ID
 *
 * Usage in amplify.yml:
 *   - node scripts/configure-cloudfront-spa.mjs
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TAG = '[configure-cloudfront-spa]';
const CF_DIST_ID = process.env.CF_DIST_ID;

if (!CF_DIST_ID) {
  console.error(`${TAG} ERROR: CF_DIST_ID environment variable is not set.`);
  process.exit(1);
}

// Validate CF_DIST_ID format to prevent command injection
// CloudFront distribution IDs are alphanumeric (e.g., E1A2B3C4D5E6F7)
if (!/^[A-Z0-9]+$/i.test(CF_DIST_ID)) {
  console.error(`${TAG} ERROR: Invalid CF_DIST_ID format: ${CF_DIST_ID}`);
  process.exit(1);
}

console.log(`${TAG} Configuring CloudFront distribution: ${CF_DIST_ID}`);

// ─── 1. Create or update CloudFront Function for URI rewriting ────────────
// This function appends `index.html` to directory-style URIs so that S3
// REST API origins can resolve static routes (e.g., /calendar/ → /calendar/index.html).

const CF_FUNCTION_NAME = `leafwise-uri-rewrite-${CF_DIST_ID}`;
const CF_FUNCTION_CODE = `
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // If URI ends with '/', append 'index.html'
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  }
  // If URI doesn't have a file extension, append '/index.html'
  // This handles paths like '/calendar' → '/calendar/index.html'
  else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}
`.trim();

let cfFunctionARN = null;

// Write function code to a temp file (used by both create and update paths)
const funcCodeFile = resolve(tmpdir(), 'cf-function-code.js');
writeFileSync(funcCodeFile, CF_FUNCTION_CODE, 'utf-8');

// Try to create or update the CloudFront Function.
// This is optional — if the build role lacks cloudfront:CreateFunction /
// cloudfront:UpdateFunction permissions, we fall back to custom error
// responses only.  The smart not-found page handles all routes client-side.
try {
  // Try to describe the function first (it may already exist)
  try {
    const describeOutput = execFileSync(
      'aws',
      ['cloudfront', 'describe-function', '--name', CF_FUNCTION_NAME, '--output', 'json'],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const described = JSON.parse(describeOutput);
    const funcETag = described.ETag;

    console.log(`${TAG} Updating existing CloudFront Function: ${CF_FUNCTION_NAME}`);

    const updateOutput = execFileSync(
      'aws',
      [
        'cloudfront',
        'update-function',
        '--name',
        CF_FUNCTION_NAME,
        '--function-config',
        '{"Comment":"URI rewrite for Next.js trailingSlash","Runtime":"cloudfront-js-2.0"}',
        '--function-code',
        `fileb://${funcCodeFile}`,
        '--if-match',
        funcETag,
        '--output',
        'json',
      ],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const updated = JSON.parse(updateOutput);
    const updatedETag = updated.ETag;

    // Publish the updated function
    const publishOutput = execFileSync(
      'aws',
      [
        'cloudfront',
        'publish-function',
        '--name',
        CF_FUNCTION_NAME,
        '--if-match',
        updatedETag,
        '--output',
        'json',
      ],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const published = JSON.parse(publishOutput);
    cfFunctionARN = published.FunctionSummary.FunctionMetadata.FunctionARN;

    console.log(`${TAG} CloudFront Function updated and published: ${cfFunctionARN}`);
  } catch {
    // Function doesn't exist — create it
    console.log(`${TAG} Creating CloudFront Function: ${CF_FUNCTION_NAME}`);

    const createOutput = execSync(
      `aws cloudfront create-function --name ${CF_FUNCTION_NAME} --function-config '{"Comment":"URI rewrite for Next.js trailingSlash","Runtime":"cloudfront-js-2.0"}' --function-code fileb://${funcCodeFile} --output json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const created = JSON.parse(createOutput);
    const createETag = created.ETag;

    // Publish the function
    const publishOutput = execSync(
      `aws cloudfront publish-function --name ${CF_FUNCTION_NAME} --if-match ${createETag} --output json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const published = JSON.parse(publishOutput);
    cfFunctionARN = published.FunctionSummary.FunctionMetadata.FunctionARN;

    console.log(`${TAG} CloudFront Function created and published: ${cfFunctionARN}`);
  }
} catch (err) {
  console.warn(`${TAG} WARNING: Could not create/update CloudFront Function.`);
  console.warn(`${TAG} The build role may lack cloudfront:CreateFunction / cloudfront:UpdateFunction permissions.`);
  console.warn(`${TAG} Deep-linking will still work via custom error responses and the smart 404 page.`);
  if (err?.stderr) {
    console.warn(`${TAG} AWS error: ${String(err.stderr).trim()}`);
  }
}

// ─── 2. Fetch current distribution config ─────────────────────────────────

try {
  const rawConfig = execSync(
    `aws cloudfront get-distribution-config --id ${CF_DIST_ID} --output json`,
    { encoding: 'utf-8' }
  );

  const parsed = JSON.parse(rawConfig);
  const etag = parsed.ETag;
  const distConfig = parsed.DistributionConfig;

  // Validate ETag format (alphanumeric string from AWS API)
  if (!etag || !/^[A-Za-z0-9]+$/.test(etag)) {
    console.error(`${TAG} ERROR: Invalid or missing ETag from distribution config.`);
    process.exit(1);
  }

  console.log(`${TAG} Current ETag: ${etag}`);

  // ─── 3. Set custom error responses for dynamic-route fallback ───────────

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

  // ─── 4. Associate CloudFront Function with default cache behavior ───────

  if (cfFunctionARN) {
    const defaultBehavior = distConfig.DefaultCacheBehavior;
    const existingAssociations = defaultBehavior.FunctionAssociations?.Items || [];

    // Remove any existing viewer-request function association (we'll add ours)
    const filteredAssociations = existingAssociations.filter(
      (a) => a.EventType !== 'viewer-request'
    );

    // Add the URI rewrite function
    filteredAssociations.push({
      FunctionARN: cfFunctionARN,
      EventType: 'viewer-request',
    });

    defaultBehavior.FunctionAssociations = {
      Quantity: filteredAssociations.length,
      Items: filteredAssociations,
    };
  } else {
    console.log(`${TAG} Skipping CloudFront Function association (function not available).`);
  }

  // ─── 5. Write updated config to temp file and update distribution ───────

  const tmpFile = resolve(tmpdir(), 'cf-dist-config.json');
  writeFileSync(tmpFile, JSON.stringify(distConfig, null, 2), 'utf-8');

  console.log(`${TAG} Updating distribution...`);

  execSync(
    `aws cloudfront update-distribution --id ${CF_DIST_ID} --distribution-config file://${tmpFile} --if-match ${etag}`,
    { encoding: 'utf-8', stdio: 'inherit' }
  );

  console.log(`${TAG} CloudFront distribution updated successfully.`);
  console.log(`${TAG} Configuration applied:`);
  if (cfFunctionARN) {
    console.log(`  CloudFront Function (viewer-request): ${CF_FUNCTION_NAME}`);
  }
  console.log('  Custom error responses:');
  console.log('    403 → /404.html (200)');
  console.log('    404 → /404.html (200)');
} catch (err) {
  console.warn(`${TAG} WARNING: Could not update CloudFront distribution config.`);
  console.warn(`${TAG} The build role may lack cloudfront:GetDistributionConfig / cloudfront:UpdateDistribution permissions.`);
  console.warn(`${TAG} Deep-linking will rely entirely on the smart 404 page for client-side routing.`);
  if (err?.stderr) {
    console.warn(`${TAG} AWS error: ${String(err.stderr).trim()}`);
  }
}
