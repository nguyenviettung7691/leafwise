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
import { getValidIdToken } from '@/contexts/AuthContext';

const AI_API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || '';

async function callFlow<TInput, TOutput>(flowName: string, input: TInput, signal?: AbortSignal): Promise<TOutput> {
  const token = await getValidIdToken();
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
    signal,
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
  input: DiagnosePlantHealthInput,
  signal?: AbortSignal
): Promise<DiagnosePlantHealthOutput> {
  return callFlow('diagnose-plant-health', input, signal);
}

export async function generateDetailedCarePlan(
  input: GenerateDetailedCarePlanInput,
  signal?: AbortSignal
): Promise<GenerateDetailedCarePlanOutput> {
  return callFlow('generate-detailed-care-plan', input, signal);
}

export async function comparePlantHealthAndUpdateSuggestion(
  input: ComparePlantHealthInput,
  signal?: AbortSignal
): Promise<ComparePlantHealthOutput> {
  return callFlow('compare-plant-health', input, signal);
}

export async function reviewAndSuggestCarePlanUpdates(
  input: ReviewCarePlanInput,
  signal?: AbortSignal
): Promise<ReviewCarePlanOutput> {
  return callFlow('review-care-plan-updates', input, signal);
}

export async function proactiveCarePlanReview(
  input: ProactiveCarePlanReviewInput,
  signal?: AbortSignal
): Promise<ReviewCarePlanOutput> {
  return callFlow('proactive-care-plan-review', input, signal);
}
