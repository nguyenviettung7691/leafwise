
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

const DiagnosePlantHealthInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  description: z.string().optional().describe('An optional user description of the plant or its symptoms.'),
});
export type DiagnosePlantHealthInput = z.infer<typeof DiagnosePlantHealthInputSchema>;

const DiagnosePlantHealthOutputSchema = z.object({
  identification: z.object({
    isPlant: z.boolean().describe('Whether or not the input image likely contains a plant.'),
    commonName: z.string().optional().describe('The common name of the identified plant, if identifiable.'),
    scientificName: z.string().optional().describe('The scientific name of the identified plant, if identifiable.'),
    familyCategory: z.string().optional().describe('The family category of the plant (e.g., Araceae, Asparagaceae, Cactaceae, Fabaceae). Used for broad categorization and filtering.'),
    ageEstimateYears: z.number().optional().describe("An estimated age of the plant in years, if discernible from the image and description. Provide a numeric value for years (e.g., 0.5 for 6 months, 1 for 1 year, 2 for 2 years)."),
  }),
  healthAssessment: z.object({
    isHealthy: z.boolean().describe('Whether or not the plant appears to be healthy.'),
    diagnosis: z.string().optional().describe("The diagnosis of the plant's health issues, if any."),
    confidence: z.enum(['low', 'medium', 'high']).optional().describe('Confidence level of the health assessment.'),
  }),
  careRecommendations: z
    .array(z.object({
        action: z.string().describe('A recommended care action.'),
        details: z.string().optional().describe('More details about the recommended action.')
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
  prompt: `You are an expert botanist and plant pathologist.
Analyze the provided plant image and optional user description to perform the following tasks:
1.  **Identification**: Determine if the image contains a plant. If it does, identify its common and scientific names. If possible, also determine its family category (e.g., Araceae, Asparagaceae, Cactaceae, Fabaceae) useful for general categorization, and estimate the plant's age in years (as a number, e.g., 0.5 for 6 months, 1, 2) if discernible. If unsure about any of these, indicate that.
2.  **Health Assessment**: Assess the plant's health. Determine if it's healthy or if it shows signs of disease, pest infestation, nutrient deficiency, or other issues. Provide a diagnosis. State your confidence level (low, medium, high) for this assessment.
3.  **Care Recommendations**: Based on your diagnosis, suggest 2-3 actionable care steps the user can take. These should be specific and helpful.

User Description (if provided): {{{description}}}
Plant Photo: {{media url=photoDataUri}}

Provide your response in the structured format defined by the output schema.
If the image does not appear to be a plant, set 'isPlant' to false and leave other fields blank or indicate non-applicability.
If the plant is healthy, reflect this in the 'isHealthy' field and diagnosis, and provide general care tips if appropriate.
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
    // Ensure output is not null, providing a default structure if the model fails to produce one.
    // This helps prevent runtime errors if the model's output is unexpectedly empty.
    if (!output) {
        console.warn('Diagnose plant health prompt returned null output. Returning default structure.');
        return {
            identification: { isPlant: false },
            healthAssessment: { isHealthy: false, diagnosis: "Unable to analyze image." },
            careRecommendations: [],
        };
    }
    return output;
  }
);
