
'use server';
/**
 * @fileOverview Generates a detailed care plan for a plant.
 *
 * - generateDetailedCarePlan - A function that generates a detailed plant care plan.
 * - GenerateDetailedCarePlanInput - The input type for the generateDetailedCarePlan function.
 * - GenerateDetailedCarePlanOutput - The return type for the generateDetailedCarePlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDetailedCarePlanInputSchema = z.object({
  plantCommonName: z.string().describe('The common name of the plant.'),
  plantScientificName: z.string().optional().describe('The scientific name of the plant.'),
  diagnosisNotes: z.string().optional().describe('Any notes from the plant health diagnosis, to help tailor the plan.'),
  carePlanMode: z.enum(['basic', 'advanced']).describe("The desired mode for the care plan: 'basic' or 'advanced'."),
  locationClimate: z.string().optional().describe('The user\'s general location or climate (e.g., "temperate, indoor", "tropical, outdoor").'),
});
export type GenerateDetailedCarePlanInput = z.infer<typeof GenerateDetailedCarePlanInputSchema>;

const CareDetailSchema = z.object({
    frequency: z.string().optional().describe('How often the task should be performed.'),
    amount: z.string().optional().describe('The amount or intensity, if applicable (e.g., for watering).'),
    details: z.string().describe('Specific instructions or notes for this care aspect.'),
});

const GenerateDetailedCarePlanOutputSchema = z.object({
  watering: CareDetailSchema.describe('Watering guidelines.'),
  lighting: CareDetailSchema.describe('Lighting requirements.'),
  basicMaintenance: z.string().describe('General basic maintenance tips.'),
  soilManagement: CareDetailSchema.optional().describe('Soil management details (for advanced mode).'),
  pruning: CareDetailSchema.optional().describe('Pruning guidelines (for advanced mode).'),
  fertilization: CareDetailSchema.optional().describe('Fertilization recommendations (for advanced mode).'),
  customizableSchedulesPlaceholder: z.string().describe('Placeholder text for customizable schedules feature.'),
  pushNotificationsPlaceholder: z.string().describe('Placeholder text for push notifications feature.'),
  activityTrackingPlaceholder: z.string().describe('Placeholder text for activity completion tracking feature.'),
});
export type GenerateDetailedCarePlanOutput = z.infer<typeof GenerateDetailedCarePlanOutputSchema>;

export async function generateDetailedCarePlan(input: GenerateDetailedCarePlanInput): Promise<GenerateDetailedCarePlanOutput> {
  return generateDetailedCarePlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDetailedCarePlanPrompt',
  input: {schema: GenerateDetailedCarePlanInputSchema},
  output: {schema: GenerateDetailedCarePlanOutputSchema},
  prompt: `You are an expert horticulturist creating a tailored care plan for a plant.

Plant Information:
- Common Name: {{{plantCommonName}}}
{{#if plantScientificName}}- Scientific Name: {{{plantScientificName}}}{{/if}}
{{#if diagnosisNotes}}- Diagnosis Notes: {{{diagnosisNotes}}}{{/if}}
{{#if locationClimate}}- Location/Climate: {{{locationClimate}}}{{/if}}

Requested Care Plan Mode: {{{carePlanMode}}}

Generate a structured care plan.

**ForAllModes:**
-   **Watering**: Provide frequency, typical amount (e.g., "water thoroughly when top inch is dry"), and key details.
-   **Lighting**: Specify type (e.g., "bright indirect light", "direct sunlight"), duration if applicable, and notes.
-   **Basic Maintenance**: General tips for upkeep.

**If carePlanMode is 'advanced', also include detailed sections for:**
-   **Soil Management**: Recommended soil type, pH, drainage considerations, and notes.
-   **Pruning**: When and how to prune, specific techniques, and notes.
-   **Fertilization**: Type of fertilizer, frequency, application notes.

**Placeholders for Future Features (include these exact phrases in the output):**
-   customizableSchedulesPlaceholder: "Customizable care schedules and task lists will be available in a future update."
-   pushNotificationsPlaceholder: "Push notification reminders for care tasks are coming soon!"
-   activityTrackingPlaceholder: "Activity completion tracking for your care tasks will be implemented in a future version."

Focus on actionable, clear advice. If location/climate is not provided, give general advice applicable to most common indoor environments for the plant if known, or state that advice may need adjustment.
`,
});

const generateDetailedCarePlanFlow = ai.defineFlow(
  {
    name: 'generateDetailedCarePlanFlow',
    inputSchema: GenerateDetailedCarePlanInputSchema,
    outputSchema: GenerateDetailedCarePlanOutputSchema,
  },
  async (input: GenerateDetailedCarePlanInput) => {
    const {output} = await prompt(input);
    if (!output) {
        // Fallback if the model returns null
        return {
            watering: { details: "Could not generate watering tips." },
            lighting: { details: "Could not generate lighting tips." },
            basicMaintenance: "Could not generate basic maintenance tips.",
            customizableSchedulesPlaceholder: "Customizable care schedules and task lists will be available in a future update.",
            pushNotificationsPlaceholder: "Push notification reminders for care tasks are coming soon!",
            activityTrackingPlaceholder: "Activity completion tracking for your care tasks will be implemented in a future version.",
        };
    }
    return output;
  }
);

