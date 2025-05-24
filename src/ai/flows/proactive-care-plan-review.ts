
'use server';
/**
 * @fileOverview Proactively reviews a plant's current care plan based on its
 * current details and suggests updates or new tasks.
 *
 * - proactiveCarePlanReview - The main function to call this flow.
 * - ProactiveCarePlanReviewInput - Input type for the flow.
 * - ReviewCarePlanOutput - Output type for the flow (reused from review-care-plan-updates).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { PlantHealthCondition, ReviewCarePlanOutput, AIGeneratedTask, ExistingTaskModificationSuggestion } from '@/types'; // Assuming ReviewCarePlanOutput is defined in types

const PlantHealthConditionSchema = z.enum(['healthy', 'needs_attention', 'sick', 'unknown']);

const CareTaskSchemaForAI = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    frequency: z.string(),
    timeOfDay: z.string().optional(),
    isPaused: z.boolean(),
    level: z.enum(['basic', 'advanced']),
});

const ProactiveCarePlanReviewInputSchema = z.object({
  plantCommonName: z.string().describe("The common name of the plant."),
  plantScientificName: z.string().optional().describe("The scientific name of the plant."),
  plantFamilyCategory: z.string().optional().describe("The family category of the plant."),
  plantAgeEstimateYears: z.number().optional().describe("Estimated age of the plant in years."),
  currentPlantHealth: PlantHealthConditionSchema.describe("The plant's current overall recorded health status."),
  plantCustomNotes: z.string().optional().describe("Any custom notes about the plant."),
  currentCareTasks: z.array(CareTaskSchemaForAI).describe("The plant's current list of care tasks."),
  languageCode: z.string().optional().describe("The language for the response (e.g., 'en', 'vi'). Default 'en'.")
});
export type ProactiveCarePlanReviewInput = z.infer<typeof ProactiveCarePlanReviewInputSchema>;


// Reusing ReviewCarePlanOutputSchema from review-care-plan-updates flow if suitable
// If not, define a specific one here. For now, assume reuse is okay.
const AITaskSuggestionDetailsSchemaForOutput = z.object({
    name: z.string().optional().describe("Suggested new task name. MUST be in the specified languageCode."),
    description: z.string().optional().describe("Suggested new task description. MUST be in the specified languageCode."),
    frequency: z.string().optional().describe("Suggested new frequency. Use formats like 'Daily', 'Weekly', 'Every X Days'. See main prompt for full list of allowed formats."),
    timeOfDay: z.string().optional().describe("Suggested new time of day. Use 'All day' or HH:MM format."),
    level: z.enum(['basic', 'advanced']).optional(),
}).describe("Details for updating an existing task. Only include fields that need to change. All text MUST be in the specified languageCode.");

const ExistingTaskModificationSuggestionSchema = z.object({
    taskId: z.string().describe("The ID of the existing task being referenced."),
    currentTaskName: z.string().describe("The name of the current task being referenced, for clarity. This may be in the original language of the task definition if not translated by user yet."),
    suggestedAction: z.enum(['keep_as_is', 'pause', 'resume', 'remove', 'update_details']).describe("The suggested action for this existing task."),
    updatedDetails: AITaskSuggestionDetailsSchemaForOutput.optional().describe("If action is 'update_details', provide the new details here. All text MUST be in the specified languageCode."),
    reasoning: z.string().optional().describe("A brief reasoning for the suggested modification. MUST be in the specified languageCode."),
});

const AIGeneratedTaskSchemaForOutput = z.object({
    taskName: z.string().describe("The specific name of the care task. MUST be in the specified languageCode."),
    taskDescription: z.string().describe("A brief description or specific instructions for the task. MUST be in the specified languageCode."),
    suggestedFrequency: z.string().describe("How often the task should be performed. Use formats like 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Ad-hoc', 'Every X Days', 'Every X Weeks', 'Every X Months'. See main prompt for exact formats."),
    suggestedTimeOfDay: z.string().describe("When the task should be performed. Use 'All day' or HH:MM format (e.g., '09:00')."),
    taskLevel: z.enum(['basic', 'advanced']).describe("The level of this task, either 'basic' or 'advanced'.")
});

const ReviewCarePlanOutputSchema = z.object({
  overallAssessment: z.string().describe("A brief, human-readable summary of the recommended changes to the care plan based on the plant's current state and existing plan. MUST be in the specified languageCode."),
  taskModifications: z.array(ExistingTaskModificationSuggestionSchema).describe("Suggestions for modifying existing tasks."),
  newTasks: z.array(AIGeneratedTaskSchemaForOutput).describe("Suggestions for entirely new tasks to add to the care plan."),
});
// Re-exporting ReviewCarePlanOutput type from types/index.ts is better
// export type ReviewCarePlanOutput = z.infer<typeof ReviewCarePlanOutputSchema>;


export async function proactiveCarePlanReview(input: ProactiveCarePlanReviewInput): Promise<ReviewCarePlanOutput> {
  return proactiveCarePlanReviewFlow(input);
}

const prompt = ai.definePrompt({
  name: 'proactiveCarePlanReviewPrompt',
  input: { schema: ProactiveCarePlanReviewInputSchema },
  output: { schema: ReviewCarePlanOutputSchema },
  prompt: `
Output Language Instructions:
ALL textual output in your response fields ('overallAssessment', 'reasoning' in taskModifications, 'name' and 'description' in updatedDetails, 'taskName' and 'taskDescription' in newTasks) MUST be in the language specified by '{{languageCode}}'.
- If '{{languageCode}}' is 'vi', respond entirely in Vietnamese.
- If '{{languageCode}}' is 'en' or not provided, respond in English.

Task:
You are an expert horticulturalist performing a proactive review of a plant's care plan.
Based on the plant's current details and its existing care tasks, provide a comprehensive review.

Plant Information:
- Common Name: {{plantCommonName}}
{{#if plantScientificName}}- Scientific Name: {{plantScientificName}}{{/if}}
{{#if plantFamilyCategory}}- Family Category: {{plantFamilyCategory}}{{/if}}
{{#if plantAgeEstimateYears}}- Estimated Age: {{plantAgeEstimateYears}} years{{/if}}
- Current Health: {{currentPlantHealth}}
{{#if plantCustomNotes}}- Custom Notes: "{{plantCustomNotes}}"{{/if}}

Current Care Plan Tasks:
{{#if currentCareTasks.length}}
{{#each currentCareTasks}}
- Task ID: {{id}}, Name: "{{name}}", Frequency: "{{frequency}}", Time: "{{timeOfDay}}", Level: "{{level}}", Paused: {{isPaused}}{{#if description}}, Description: "{{description}}"{{/if}}
{{/each}}
{{else}}
- No current care tasks defined.
{{/if}}

Please provide:
1.  An 'overallAssessment' (in '{{languageCode}}') summarizing the suitability of the current care plan given the plant's details and health.
2.  For 'taskModifications':
    *   Review each of the 'currentCareTasks'.
    *   For each task, decide on a 'suggestedAction' ('keep_as_is', 'pause', 'resume', 'remove', 'update_details').
    *   If 'suggestedAction' is 'update_details', provide *only* the changed fields in 'updatedDetails'. Textual fields in 'updatedDetails' (name, description) MUST be in '{{languageCode}}'.
    *   For 'frequency' in 'updatedDetails', use one of these formats: 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Ad-hoc', 'Every X Days', 'Every X Weeks', 'Every X Months'.
    *   For 'timeOfDay' in 'updatedDetails', use 'All day' or HH:MM format (e.g., "09:00").
    *   You MUST include the original 'taskId' and 'currentTaskName' for each modification.
    *   Provide a brief 'reasoning' (in '{{languageCode}}') for each suggested modification.
3.  For 'newTasks':
    *   Suggest any entirely new tasks if the current plan is insufficient or could be improved. 'taskName' and 'taskDescription' MUST be in '{{languageCode}}'.
    *   For 'suggestedFrequency', use one of these formats: 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Ad-hoc', 'Every X Days', 'Every X Weeks', 'Every X Months'.
    *   For 'suggestedTimeOfDay', use 'All day' or HH:MM format (e.g., "09:00").
    *   'taskLevel' must be 'basic' or 'advanced'.

Consider factors like the plant's current health, age, species (implied by name/family), and notes. For example, if a plant is sick, fertilization tasks might need to be paused. If it's healthy and mature, pruning might be suggested.

Return ONLY the JSON object adhering to the output schema.
`,
});

const proactiveCarePlanReviewFlow = ai.defineFlow(
  {
    name: 'proactiveCarePlanReviewFlow',
    inputSchema: ProactiveCarePlanReviewInputSchema,
    outputSchema: ReviewCarePlanOutputSchema,
  },
  async (input: ProactiveCarePlanReviewInput): Promise<ReviewCarePlanOutput> => {
    const saneInput = {
      ...input,
      currentCareTasks: Array.isArray(input.currentCareTasks) ? input.currentCareTasks : [],
    };
    const { output } = await prompt(saneInput);
    const lang = input.languageCode === 'vi' ? 'vi' : 'en';
    const defaultAssessment = lang === 'vi' ? "Đánh giá của AI không được cung cấp." : "AI assessment was not provided.";

    if (!output) {
      console.warn('Proactive Care Plan Review prompt returned null output. Returning default structure.');
      return {
        overallAssessment: defaultAssessment,
        taskModifications: [],
        newTasks: [],
      };
    }
    return {
      overallAssessment: output.overallAssessment || defaultAssessment,
      taskModifications: Array.isArray(output.taskModifications) ? output.taskModifications : [],
      newTasks: Array.isArray(output.newTasks) ? output.newTasks : [],
    };
  }
);
    

    