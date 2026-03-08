import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { validateToken } from './jwt-validator';
import { diagnosePlantHealth } from './flows/diagnose-plant-health';
import { generateDetailedCarePlan } from './flows/generate-detailed-care-plan';
import { comparePlantHealthAndUpdateSuggestion } from './flows/compare-plant-health';
import { reviewAndSuggestCarePlanUpdates } from './flows/review-care-plan-updates';
import { proactiveCarePlanReview } from './flows/proactive-care-plan-review';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

type FlowFunction = (input: Record<string, unknown>) => Promise<unknown>;

const flowMap: Record<string, FlowFunction> = {
  'diagnose-plant-health': diagnosePlantHealth as FlowFunction,
  'generate-detailed-care-plan': generateDetailedCarePlan as FlowFunction,
  'compare-plant-health': comparePlantHealthAndUpdateSuggestion as FlowFunction,
  'review-care-plan-updates': reviewAndSuggestCarePlanUpdates as FlowFunction,
  'proactive-care-plan-review': proactiveCarePlanReview as FlowFunction,
};

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };
}

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify(body),
  };
}

/**
 * Extracts the flow name from the request path.
 * Expects path format: /api/ai/{flowName}
 */
function extractFlowName(rawPath: string): string | null {
  const match = rawPath.match(/^\/api\/ai\/([a-z-]+)$/);
  return match ? match[1] : null;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  // Handle CORS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  // Only accept POST
  if (event.requestContext.http.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // Extract flow name from path
  const flowName = extractFlowName(event.rawPath);
  if (!flowName || !flowMap[flowName]) {
    return jsonResponse(404, { error: `Unknown flow: ${flowName || 'none'}` });
  }

  // Validate JWT token
  const token = event.headers?.['authorization'] || event.headers?.['Authorization'];
  if (!token) {
    return jsonResponse(401, { error: 'Missing authorization token' });
  }

  try {
    await validateToken(token);
  } catch (err) {
    console.error('JWT validation failed:', err);
    return jsonResponse(401, { error: 'Invalid or expired token' });
  }

  // Parse request body
  let input: Record<string, unknown>;
  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf-8')
      : event.body || '{}';
    input = JSON.parse(body);
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  // Execute the flow
  try {
    const result = await flowMap[flowName](input);
    return jsonResponse(200, result);
  } catch (err) {
    console.error(`Flow "${flowName}" failed:`, err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse(500, { error: message });
  }
};
