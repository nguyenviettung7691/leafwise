
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
    isHealthy: z.boolean().describe('Whether or not the plant appears to be healthy.'),
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
  prompt: `CRITICAL INSTRUCTION: ALL textual output in your response fields (commonName, familyCategory, diagnosis, careRecommendations action & details) MUST be in the language specified by '{{languageCode}}'. If '{{languageCode}}' is 'vi', respond entirely in Vietnamese. If '{{languageCode}}' is 'en' or not provided, respond in English. Scientific names can remain in Latin.

You are an expert botanist and plant pathologist.
Analyze the provided plant image and optional user description to perform the following tasks, strictly adhering to the language instruction above.

1.  **Identification**: Determine if the image contains a plant. If it does, identify its common name (in '{{languageCode}}'), scientific name, family category (in '{{languageCode}}' if a common term exists, otherwise standard botanical term), and estimate the plant's age in years (as a number). If unsure, indicate that.
2.  **Health Assessment**: Assess the plant's health. Determine if it's healthy or shows signs of disease, pest, deficiency, etc. Provide a diagnosis (in '{{languageCode}}'). State your confidence level (low, medium, high).
3.  **Care Recommendations**: Based on your diagnosis, suggest 2-3 actionable care steps. Frame these as common care task categories (e.g., Watering, Lighting, Pest Control) with action names and details in '{{languageCode}}'. Examples:
    - If overwatered: 'Action: Điều chỉnh Tưới nước', 'Details: Giảm tần suất và đảm bảo chậu thoát nước tốt.' (if languageCode='vi')
    - If pests: 'Action: Pest Control', 'Details: Identify pest and treat with organic insecticide.' (if languageCode='en')

User Description (if provided): {{{description}}}
Plant Photo: {{media url=photoDataUri}}

Provide your response ONLY in the structured JSON format defined by the output schema.
If the image does not appear to be a plant, set 'isPlant' to false and leave other text fields blank or indicate non-applicability in the specified language.
If the plant is healthy, reflect this in 'isHealthy' and 'diagnosis' (in '{{languageCode}}'), and provide general care tips if appropriate (in '{{languageCode}}').
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
    if (!output) {
        console.warn('Diagnose plant health prompt returned null output. Returning default structure.');
        const lang = input.languageCode === 'vi' ? 'vi' : 'en';
        const errorMsg = lang === 'vi' ? "Không thể phân tích hình ảnh." : "Unable to analyze image.";
        return {
            identification: { isPlant: false },
            healthAssessment: { isHealthy: false, diagnosis: errorMsg },
            careRecommendations: [],
        };
    }
    return output;
  }
);

