'use server';
/**
 * @fileOverview A plant problem diagnosis AI agent.
 *
 * - diagnosePlantHealth - A function that handles the plant diagnosis process.
 * - DiagnosePlantHealthInput - The input type for the diagnosePlantHealth function.
 * - DiagnosePlantHealthOutput - The return type for the diagnosePlantHealth function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { PlantHealthCondition } from '@/types';

const PlantHealthConditionSchema = z.enum(['healthy', 'needs_attention', 'sick', 'unknown']);

const DiagnosePlantHealthInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().optional().describe('An optional user description of the plant or its symptoms.'),
  languageCode: z.string().optional().describe("The desired language for the response (e.g., 'en', 'vi'). Default to English if not provided."),
});
export type DiagnosePlantHealthInput = z.infer<typeof DiagnosePlantHealthInputSchema>;

const DiagnosePlantHealthOutputSchema = z.object({
  identification: z.object({
    isPlant: z.boolean().describe('Whether or not the input image likely contains a plant.'),
    commonName: z.string().optional().describe('The common name of the identified plant, if identifiable. This MUST be in the specified languageCode.'),
    scientificName: z.string().optional().describe('The scientific name of the identified plant, if identifiable. (Latin names are usually language-independent).'),
    familyCategory: z.string().optional().describe('The family category of the plant (e.g., Araceae, Asparagaceae, Cactaceae, Fabaceae). This MUST be in the specified languageCode if a common term exists, otherwise use a standard botanical term.'),
    ageEstimateYears: z.number().optional().describe("An estimated age of the plant in years, if discernible from the image and description. Provide a numeric value for years (e.g., 0.5 for 6 months, 1 for 1 year, 2 for 2 years)."),
  }),
  healthAssessment: z.object({
    status: PlantHealthConditionSchema.describe("The overall health status of the plant. Must be one of 'healthy', 'needs_attention', 'sick', or 'unknown'. This MUST be the determined status string."),
    diagnosis: z.string().optional().describe("The diagnosis of the plant's health issues, if any. This MUST be in the specified languageCode."),
    confidence: z.enum(['low', 'medium', 'high']).optional().describe('Confidence level of the health assessment.'),
  }),
  careRecommendations: z
    .array(z.object({
        action: z.string().describe('A recommended care action, often framed as a care category like "Adjust Watering", "Pest Control", "Improve Lighting". This action name MUST be in the specified languageCode.'),
        details: z.string().optional().describe('More details about the recommended action, explaining what to do and why. This MUST be in the specified languageCode.')
    }))
    .describe('A list of recommended care actions based on the diagnosis.'),
});
export type DiagnosePlantHealthOutput = z.infer<typeof DiagnosePlantHealthOutputSchema>;

export async function diagnosePlantHealth(input: DiagnosePlantHealthInput): Promise<DiagnosePlantHealthOutput> {
  return diagnosePlantHealthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'diagnosePlantHealthPrompt',
  input: {schema: DiagnosePlantHealthInputSchema},
  output: {schema: DiagnosePlantHealthOutputSchema},
  prompt: `Output Language Instructions:
Your entire response MUST be in the language specified by '{{languageCode}}'.
- If '{{languageCode}}' is 'vi', all textual fields (commonName, familyCategory, diagnosis, care recommendation actions and details) MUST be in Vietnamese.
- Otherwise (e.g., 'en' or if '{{languageCode}}' is not provided), all these fields MUST be in English.
- This language rule applies strictly, even if the optional 'description' field from the user is empty or not provided.
- Scientific names (e.g., 'scientificName') can remain in Latin as they are generally language-independent.
- The 'status' field in 'healthAssessment' MUST be one of the exact enum values: 'healthy', 'needs_attention', 'sick', or 'unknown', and should NOT be translated.
- **CRITICAL**: The textual 'diagnosis' field in 'healthAssessment' MUST directly reflect and be consistent with the chosen 'status' field. For example:
    - If 'status' is 'healthy', the 'diagnosis' text MUST clearly state the plant is healthy and may describe positive attributes. It should NOT mention any problems or issues.
    - If 'status' is 'needs_attention', the 'diagnosis' text MUST describe the specific minor issues observed that warrant this status.
    - If 'status' is 'sick', the 'diagnosis' text MUST describe the symptoms or causes of the sickness.
    - If 'status' is 'unknown', the 'diagnosis' text should indicate uncertainty.

Task:
You are an expert botanist and plant pathologist. Analyze the provided plant image and optional user description to perform the following tasks, strictly adhering to the language and consistency instructions above.

1.  **Identification**:
    *   Determine if the image contains a plant ('isPlant': boolean).
    *   If it is a plant, identify its 'commonName' (in the specified language).
    *   Identify its 'scientificName' (Latin).
    *   Identify its 'familyCategory' (in the specified language if a common term exists, otherwise use a standard botanical term).
    *   Estimate the plant's 'ageEstimateYears' (numeric).
    *   If unsure about any identification detail, indicate that appropriately in the specified language or leave the field blank if optional.

2.  **Health Assessment**:
    *   Assess the plant's health 'status' (must be one of 'healthy', 'needs_attention', 'sick', 'unknown').
    *   Provide a 'diagnosis' (in the specified language) detailing any issues. **The textual 'diagnosis' MUST be consistent with and justify the chosen 'status' as per the CRITICAL instruction above.**
    *   State your 'confidence' level for the assessment ('low', 'medium', 'high').

3.  **Care Recommendations**:
    *   Based on your diagnosis, suggest 2-3 actionable care steps as an array of objects in 'careRecommendations'.
    *   Each object should have an 'action' (a short summary of the care category, in the specified language, e.g., "Watering Adjustment", "Pest Control", "Improve Lighting").
    *   Each object can have 'details' (more specific advice, in the specified language).
    *   Example for languageCode='vi': { "action": "Điều chỉnh Tưới nước", "details": "Giảm tần suất và đảm bảo chậu thoát nước tốt." }
    *   Example for languageCode='en': { "action": "Pest Control", "details": "Identify pest and treat with organic insecticide." }

User Input:
{{#if description}}User Description: {{{description}}}{{else}}User Description: Not provided.{{/if}}
Plant Photo: {{media url=photoDataUri}}

Output Format:
Provide your response ONLY in the structured JSON format defined by the output schema.
If the image does not appear to be a plant, set 'isPlant' to false and 'healthAssessment.status' to 'unknown'. Leave other text fields blank or provide non-applicable messages in the specified language (e.g., if 'vi', 'Không phải là thực vật.').
If the plant is healthy, set 'healthAssessment.status' to 'healthy', provide a 'diagnosis' stating it's healthy (in the specified language and consistent with the 'status'), and give general care tips if appropriate for 'careRecommendations' (in the specified language).
`,
});

const diagnosePlantHealthFlow = ai.defineFlow(
  {
    name: 'diagnosePlantHealthFlow',
    inputSchema: DiagnosePlantHealthInputSchema,
    outputSchema: DiagnosePlantHealthOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    const lang = input.languageCode === 'vi' ? 'vi' : 'en';
    const errorMsg = lang === 'vi' ? "Không thể phân tích hình ảnh." : "Unable to analyze image.";
    const isPlantMsg = lang === 'vi' ? "Hình ảnh không phải là thực vật." : "Image does not appear to be a plant.";

    if (!output || !output.healthAssessment) { // Added check for healthAssessment
        console.warn('Diagnose plant health prompt returned null or malformed output. Returning default structure.');
        return {
            identification: {
              isPlant: false,
              commonName: isPlantMsg,
              scientificName: undefined, // Explicitly undefined
              familyCategory: undefined, // Explicitly undefined
              ageEstimateYears: undefined, // Explicitly undefined
            },
            healthAssessment: { status: 'unknown', diagnosis: errorMsg, confidence: 'low' }, // 'unknown' is a valid PlantHealthCondition
            careRecommendations: [], // [] is a valid array
        } as DiagnosePlantHealthOutput; // Explicitly cast to the output type
    }

    // Ensure status is always one of the enum values, even if AI fails
    const validStatus = ['healthy', 'needs_attention', 'sick', 'unknown'].includes(output.healthAssessment.status)
      ? output.healthAssessment.status as PlantHealthCondition // Cast here after check
      : 'unknown' as PlantHealthCondition; // Cast default as well

    // Construct the return object explicitly to ensure correct typing
    const validatedOutput: DiagnosePlantHealthOutput = {
        identification: {
            isPlant: output.identification?.isPlant ?? false,
            commonName: output.identification?.commonName ?? undefined,
            scientificName: output.identification?.scientificName ?? undefined,
            familyCategory: output.identification?.familyCategory ?? undefined,
            ageEstimateYears: output.identification?.ageEstimateYears ?? undefined,
        },
        healthAssessment: {
            status: validStatus, // Use the validated status
            diagnosis: output.healthAssessment?.diagnosis ?? undefined,
            confidence: output.healthAssessment?.confidence ?? undefined,
        },
        careRecommendations: Array.isArray(output.careRecommendations) ? output.careRecommendations : [],
    };

    return validatedOutput;
  }
);