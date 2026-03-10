'use client';

import type {
  DiagnosePlantHealthInput,
  DiagnosePlantHealthOutput,
  GenerateDetailedCarePlanInput,
  GenerateDetailedCarePlanOutput,
  ComparePlantHealthInput,
  ComparePlantHealthOutput,
  ReviewCarePlanInput,
  ReviewCarePlanOutput,
  ProactiveCarePlanReviewInput,
} from '@/types';

const AI_API_BASE = (process.env.NEXT_PUBLIC_AI_API_URL || '').replace(/\/+$/, '');

function getIdToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('cognito_tokens');
    if (!stored) return null;
    const tokens = JSON.parse(stored);
    return tokens.idToken || null;
  } catch {
    return null;
  }
}

async function callFlow<TInput, TOutput>(flowName: string, input: TInput): Promise<TOutput> {
  const token = getIdToken();
  if (!token) {
    throw new Error('Not authenticated — no ID token found');
  }

  const url = `${AI_API_BASE}/api/ai/${flowName}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || `AI flow "${flowName}" failed with status ${response.status}`;
    } catch {
      errorMessage = `AI flow "${flowName}" failed with status ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<TOutput>;
}

export async function diagnosePlantHealth(
  input: DiagnosePlantHealthInput
): Promise<DiagnosePlantHealthOutput> {
  return callFlow('diagnose-plant-health', input);
}

export async function generateDetailedCarePlan(
  input: GenerateDetailedCarePlanInput
): Promise<GenerateDetailedCarePlanOutput> {
  return callFlow('generate-detailed-care-plan', input);
}

export async function comparePlantHealthAndUpdateSuggestion(
  input: ComparePlantHealthInput
): Promise<ComparePlantHealthOutput> {
  return callFlow('compare-plant-health', input);
}

export async function reviewAndSuggestCarePlanUpdates(
  input: ReviewCarePlanInput
): Promise<ReviewCarePlanOutput> {
  return callFlow('review-care-plan-updates', input);
}

export async function proactiveCarePlanReview(
  input: ProactiveCarePlanReviewInput
): Promise<ReviewCarePlanOutput> {
  return callFlow('proactive-care-plan-review', input);
}
