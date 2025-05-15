
'use server';
/**
 * @fileOverview Compares a plant's current overall health with a new diagnosis
 * and suggests if the overall health status should be updated.
 *
 * - comparePlantHealthAndUpdateSuggestion - Compares health and provides suggestions.
 * - ComparePlantHealthInput - Input type for the comparison.
 * - ComparePlantHealthOutput - Output type for the comparison.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { PlantHealthCondition } from '@/types';
import type { DiagnosePlantHealthOutput } from './diagnose-plant-health'; // For HealthAssessment part

const PlantHealthConditionSchema = z.enum(['healthy', 'needs_attention', 'sick', 'unknown']);

const ComparePlantHealthInputSchema = z.object({
  currentPlantHealth: PlantHealthConditionSchema.describe("The plant's current overall recorded health status."),
  newPhotoDiagnosisNotes: z.string().optional().describe("The textual diagnosis from the new photo analysis."),
  newPhotoHealthStatus: PlantHealthConditionSchema.describe("The health status determined from the new photo analysis.")
});
export type ComparePlantHealthInput = z.infer<typeof ComparePlantHealthInputSchema>;

const ComparePlantHealthOutputSchema = z.object({
  comparisonSummary: z.string().describe("A human-readable summary comparing the current overall health with the new photo's diagnosis."),
  shouldUpdateOverallHealth: z.boolean().describe("Whether the AI suggests updating the plant's overall health status based on the new diagnosis."),
  suggestedOverallHealth: PlantHealthConditionSchema.optional().describe("The suggested new overall health status if an update is recommended."),
});
export type ComparePlantHealthOutput = z.infer<typeof ComparePlantHealthOutputSchema>;

export async function comparePlantHealthAndUpdateSuggestion(input: ComparePlantHealthInput): Promise<ComparePlantHealthOutput> {
  return comparePlantHealthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'comparePlantHealthPrompt',
  input: { schema: ComparePlantHealthInputSchema },
  output: { schema: ComparePlantHealthOutputSchema },
  prompt: `You are a plant health monitoring assistant.
A plant's current overall health is recorded as: '{{currentPlantHealth}}'.
A new photo of the plant has just been analyzed, yielding the following assessment:
- Health Status from new photo: '{{newPhotoHealthStatus}}'
{{#if newPhotoDiagnosisNotes}}- Diagnosis notes from new photo: "{{newPhotoDiagnosisNotes}}"{{/if}}

Based on this new information, please:
1.  Provide a brief 'comparisonSummary' comparing the plant's recorded overall health with this new assessment.
2.  Determine if the new assessment is significantly different enough to warrant updating the plant's overall recorded health status ('shouldUpdateOverallHealth'). Consider if the new status is a clear change (e.g., 'healthy' to 'sick', or 'sick' to 'healthy'). Minor fluctuations or remaining in a similar state (e.g. 'needs_attention' to 'needs_attention' with slightly different notes) might not always warrant an overall status update unless the notes indicate a significant shift.
3.  If an update is warranted, suggest the 'suggestedOverallHealth' status. This should usually be the 'newPhotoHealthStatus' unless there's a strong reason to moderate it (which is unlikely for this task).

Examples:
- If current is 'healthy' and new is 'sick' with "severe pest infestation", suggest update to 'sick'.
- If current is 'sick' and new is 'healthy' with "plant has recovered well", suggest update to 'healthy'.
- If current is 'needs_attention' and new is 'needs_attention' with "still some yellow leaves", likely don't suggest update, summary "Continues to need attention for yellow leaves".
- If current is 'healthy' and new is 'healthy', summary "Remains healthy."

Return your response in the specified JSON format.
`,
});

const comparePlantHealthFlow = ai.defineFlow(
  {
    name: 'comparePlantHealthFlow',
    inputSchema: ComparePlantHealthInputSchema,
    outputSchema: ComparePlantHealthOutputSchema,
  },
  async (input: ComparePlantHealthInput) => {
    const { output } = await prompt(input);
    if (!output) {
      // Fallback logic if the model returns null
      console.warn('Compare plant health prompt returned null output. Returning default structure.');
      return {
        comparisonSummary: "Unable to compare health at this time.",
        shouldUpdateOverallHealth: false,
      };
    }
    return output;
  }
);
