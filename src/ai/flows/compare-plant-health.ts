
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


const PlantHealthConditionSchema = z.enum(['healthy', 'needs_attention', 'sick', 'unknown']);

const ComparePlantHealthInputSchema = z.object({
  currentPlantHealth: PlantHealthConditionSchema.describe("The plant's current overall recorded health status."),
  newPhotoDiagnosisNotes: z.string().optional().describe("The textual diagnosis from the new photo analysis."),
  newPhotoHealthStatus: PlantHealthConditionSchema.describe("The health status determined from the new photo analysis. Must be one of 'healthy', 'needs_attention', 'sick', 'unknown'."),
  languageCode: z.string().optional().describe("The language for the response (e.g., 'en', 'vi'). Default 'en'.")
});
export type ComparePlantHealthInput = z.infer<typeof ComparePlantHealthInputSchema>;

const ComparePlantHealthOutputSchema = z.object({
  comparisonSummary: z.string().describe("A human-readable summary comparing the current overall health with the new photo's diagnosis. This summary MUST be in the specified languageCode."),
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
  prompt: `
Output Language Instructions:
Your 'comparisonSummary' output field MUST be in the language specified by '{{languageCode}}'.
- If '{{languageCode}}' is 'vi', the summary must be in Vietnamese.
- If '{{languageCode}}' is 'en' or not provided, the summary must be in English.
The 'suggestedOverallHealth' field should be one of the enum values and not translated.

Task:
You are a plant health monitoring assistant.
A plant's current overall health is recorded as: '{{currentPlantHealth}}'.
A new photo of the plant has just been analyzed, yielding the following assessment:
- Health Status from new photo: '{{newPhotoHealthStatus}}'
{{#if newPhotoDiagnosisNotes}}- Diagnosis notes from new photo: "{{newPhotoDiagnosisNotes}}"{{/if}}

Based on this new information, please:
1.  Provide a brief 'comparisonSummary' (adhering to Output Language Instructions) comparing the plant's recorded overall health with this new assessment.
2.  Determine if the new assessment is significantly different enough to warrant updating the plant's overall recorded health status ('shouldUpdateOverallHealth'). Consider if the new status is a clear change (e.g., 'healthy' to 'sick', or 'sick' to 'healthy'). Minor fluctuations or remaining in a similar state (e.g. 'needs_attention' to 'needs_attention' with slightly different notes) might not always warrant an overall status update unless the notes indicate a significant shift.
3.  If an update is warranted, suggest the 'suggestedOverallHealth' status. This should usually be the 'newPhotoHealthStatus'.

Examples:
- If current is 'healthy' and new is 'sick' with "severe pest infestation", suggest update to 'sick'. Summary (en): "The plant's health has declined from healthy to sick due to a severe pest infestation."
- If current is 'sick' and new is 'healthy' with "plant has recovered well", suggest update to 'healthy'. Summary (vi): "Sức khỏe của cây đã cải thiện từ bị bệnh sang khỏe mạnh, cây phục hồi tốt."
- If current is 'needs_attention' and new is 'needs_attention' with "still some yellow leaves", likely don't suggest update. Summary (en): "The plant continues to need attention for yellow leaves, with no significant change from the previous assessment."

Return your response ONLY in the specified JSON format.
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
      console.warn('Compare plant health prompt returned null output. Returning default structure.');
      const lang = input.languageCode === 'vi' ? 'vi' : 'en';
      const errorMsg = lang === 'vi' ? "Không thể so sánh sức khỏe vào lúc này." : "Unable to compare health at this time.";
      return {
        comparisonSummary: errorMsg,
        shouldUpdateOverallHealth: false,
      };
    }
    return output;
  }
);


    