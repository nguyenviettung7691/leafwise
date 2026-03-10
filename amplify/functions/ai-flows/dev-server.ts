import { config } from 'dotenv';
config();

import http from 'http';
import { diagnosePlantHealth } from './flows/diagnose-plant-health';
import { generateDetailedCarePlan } from './flows/generate-detailed-care-plan';
import { comparePlantHealthAndUpdateSuggestion } from './flows/compare-plant-health';
import { reviewAndSuggestCarePlanUpdates } from './flows/review-care-plan-updates';
import { proactiveCarePlanReview } from './flows/proactive-care-plan-review';

type FlowFunction = (input: Record<string, unknown>) => Promise<unknown>;

const flowMap: Record<string, FlowFunction> = {
  'diagnose-plant-health': diagnosePlantHealth as FlowFunction,
  'generate-detailed-care-plan': generateDetailedCarePlan as FlowFunction,
  'compare-plant-health': comparePlantHealthAndUpdateSuggestion as FlowFunction,
  'review-care-plan-updates': reviewAndSuggestCarePlanUpdates as FlowFunction,
  'proactive-care-plan-review': proactiveCarePlanReview as FlowFunction,
};

const PORT = parseInt(process.env.AI_DEV_PORT || '4100', 10);

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };
}

function extractFlowName(pathname: string): string | null {
  const normalized = pathname.replace(/\/+/g, '/');
  const match = normalized.match(/^\/api\/ai\/([a-z-]+)$/);
  return match ? match[1] : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const headers = corsHeaders();

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const flowName = extractFlowName(url.pathname);
  if (!flowName || !flowMap[flowName]) {
    res.writeHead(404, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify({ error: `Unknown flow: ${flowName || 'none'}` }));
    return;
  }

  // Read body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  try {
    console.log(`[ai-dev] Running flow: ${flowName}`);
    const result = await flowMap[flowName](input);
    res.writeHead(200, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error(`[ai-dev] Flow "${flowName}" failed:`, err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.writeHead(500, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify({ error: message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n  AI Dev Server running at http://localhost:${PORT}`);
  console.log(`  Available flows:`);
  for (const name of Object.keys(flowMap)) {
    console.log(`    POST http://localhost:${PORT}/api/ai/${name}`);
  }
  console.log();
});
