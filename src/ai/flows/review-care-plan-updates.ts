
'use server';
/**
 * @fileOverview Reviews a plant's current care plan against a new diagnosis
 * and suggests updates to existing tasks or new tasks.
 *
 * - reviewAndSuggestCarePlanUpdates - The main function to call this flow.
 * - ReviewCarePlanInput - Input type for the flow.
 * - ReviewCarePlanOutput - Output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { CareTask, AIGeneratedTask, AITaskSuggestionDetails } from '@/types';

// Schemas for the new flow
const CareTaskSchemaForAI = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    frequency: z.string(),
    timeOfDay: z.string().optional(),
    isPaused: z.boolean(),
    level: z.enum(['basic', 'advanced']),
});

const ReviewCarePlanInputSchema = z.object({
  plantCommonName: z.string().describe("The common name of the plant."),
  newPhotoDiagnosisNotes: z.string().describe("The textual diagnosis from the new photo analysis."),
  newPhotoHealthIsHealthy: z.boolean().describe("Whether the new photo diagnosis indicates the plant is healthy."),
  currentCareTasks: z.array(CareTaskSchemaForAI).describe("The plant's current list of care tasks."),
});
export type ReviewCarePlanInput = z.infer<typeof ReviewCarePlanInputSchema>;


const AITaskSuggestionDetailsSchema = z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    frequency: z.string().optional().describe("Suggested new frequency. Use formats like 'Daily', 'Weekly', 'Every X Days'. See main prompt for full list of allowed formats."),
    timeOfDay: z.string().optional().describe("Suggested new time of day. Use 'All day' or HH:MM format."),
    level: z.enum(['basic', 'advanced']).optional(),
}).describe("Details for updating an existing task. Only include fields that need to change.");

const ExistingTaskModificationSuggestionSchema = z.object({
    taskId: z.string().describe("The ID of the existing task being referenced."),
    currentTaskName: z.string().describe("The name of the current task being referenced, for clarity."),
    suggestedAction: z.enum(['keep_as_is', 'pause', 'resume', 'remove', 'update_details']).describe("The suggested action for this existing task."),
    updatedDetails: AITaskSuggestionDetailsSchema.optional().describe("If action is 'update_details', provide the new details here."),
    reasoning: z.string().optional().describe("A brief reasoning for the suggested modification."),
});

const AIGeneratedTaskSchema = z.object({
    taskName: z.string().describe("The specific name of the care task (e.g., 'Watering', 'Check Soil Moisture', 'Fertilize with Balanced NPK')."),
    taskDescription: z.string().describe("A brief description or specific instructions for the task."),
    suggestedFrequency: z.string().describe("How often the task should be performed. Use formats like 'Daily', 'Weekly', 'Every X Days'. See main prompt for exact formats."),
    suggestedTimeOfDay: z.string().describe("When the task should be performed. Use 'All day' or HH:MM format (e.g., '09:00')."),
    taskLevel: z.enum(['basic', 'advanced']).describe("The level of this task, either 'basic' or 'advanced'.")
});

const ReviewCarePlanOutputSchema = z.object({
  overallAssessment: z.string().describe("A brief, human-readable summary of the recommended changes to the care plan based on the new diagnosis."),
  taskModifications: z.array(ExistingTaskModificationSuggestionSchema).describe("Suggestions for modifying existing tasks."),
  newTasks: z.array(AIGeneratedTaskSchema).describe("Suggestions for entirely new tasks to add to the care plan."),
});
export type ReviewCarePlanOutput = z.infer<typeof ReviewCarePlanOutputSchema>;

export async function reviewAndSuggestCarePlanUpdates(input: ReviewCarePlanInput): Promise<ReviewCarePlanOutput> {
  return reviewCarePlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'reviewCarePlanUpdatesPrompt',
  input: { schema: ReviewCarePlanInputSchema },
  output: { schema: ReviewCarePlanOutputSchema },
  prompt: `You are an expert horticulturalist assisting a user with updating their plant's care plan.
Plant Name: {{plantCommonName}}

A new photo diagnosis has been performed:
- Diagnosis Notes: "{{newPhotoDiagnosisNotes}}"
- Plant is Healthy (based on new photo): {{newPhotoHealthIsHealthy}}

The plant's current care plan tasks are:
{{#if currentCareTasks.length}}
{{#each currentCareTasks}}
- Task ID: {{id}}, Name: "{{name}}", Frequency: "{{frequency}}", Time: "{{timeOfDay}}", Level: "{{level}}", Paused: {{isPaused}}{{#if description}}, Description: "{{description}}"{{/if}}
{{/each}}
{{else}}
- No current care tasks defined.
{{/if}}

Based on the new diagnosis, please:
1.  Provide an 'overallAssessment' summarizing your recommendations for the care plan.
2.  For 'taskModifications':
    *   Review each of the 'currentCareTasks'.
    *   For each task, decide on a 'suggestedAction':
        *   'keep_as_is': If the task is still appropriate and needs no changes.
        *   'pause': If the task should be temporarily paused (e.g., stop fertilizing a sick plant).
        *   'resume': If a currently paused task should be resumed.
        *   'remove': If the task is no longer needed or is detrimental.
        *   'update_details': If the task's details (name, description, frequency, timeOfDay, level) should change. If so, provide *only* the changed fields in 'updatedDetails'.
            *   For 'frequency' in 'updatedDetails', use one of these formats: 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Ad-hoc', 'Every X Days', 'Every X Weeks', 'Every X Months'.
            *   For 'timeOfDay' in 'updatedDetails', use 'All day' or HH:MM format (e.g., "09:00").
    *   You MUST include the original 'taskId' and 'currentTaskName' for each modification.
    *   Provide a brief 'reasoning' for each suggested modification, especially for 'pause', 'remove', or 'update_details'.
3.  For 'newTasks':
    *   Suggest any entirely new tasks that should be added to the care plan based on the new diagnosis.
    *   For each new task, provide: 'taskName', 'taskDescription', 'suggestedFrequency', 'suggestedTimeOfDay', and 'taskLevel'.
        *   For 'suggestedFrequency', use one of these formats: 'Daily', 'Weekly', 'Monthly', 'Yearly', 'Ad-hoc', 'Every X Days', 'Every X Weeks', 'Every X Months'.
        *   For 'suggestedTimeOfDay', use 'All day' or HH:MM format (e.g., "09:00").
        *   'taskLevel' must be 'basic' or 'advanced'.

Return ONLY the JSON object adhering to the output schema. If no changes or new tasks are needed for a perfectly healthy plant with an adequate plan, reflect this in the 'overallAssessment' and return empty arrays for 'taskModifications' and 'newTasks' (or 'taskModifications' where all actions are 'keep_as_is').
Consider the new health status ({{newPhotoHealthIsHealthy}}) and diagnosis notes ("{{newPhotoDiagnosisNotes}}") carefully when making suggestions.
Example for 'updatedDetails': If only frequency needs to change for a task, 'updatedDetails' would be { "frequency": "Every 10 Days" }. Other fields like name, description, timeOfDay, level for that task would be omitted from 'updatedDetails' if they don't change.
`,
});

const reviewCarePlanFlow = ai.defineFlow(
  {
    name: 'reviewCarePlanFlow',
    inputSchema: ReviewCarePlanInputSchema,
    outputSchema: ReviewCarePlanOutputSchema,
  },
  async (input: ReviewCarePlanInput) => {
    // Ensure currentCareTasks is always an array, even if undefined in input (though schema should prevent this)
    const saneInput = {
      ...input,
      currentCareTasks: Array.isArray(input.currentCareTasks) ? input.currentCareTasks : [],
    };
    const { output } = await prompt(saneInput);
    if (!output) {
      console.warn('Review Care Plan Updates prompt returned null output. Returning default structure.');
      return {
        overallAssessment: "Unable to review care plan at this time. The AI did not provide a response.",
        taskModifications: [],
        newTasks: [],
      };
    }
    // Ensure arrays are present in output, even if AI omits them
    return {
      overallAssessment: output.overallAssessment || "AI assessment was not provided.",
      taskModifications: Array.isArray(output.taskModifications) ? output.taskModifications : [],
      newTasks: Array.isArray(output.newTasks) ? output.newTasks : [],
    };
  }
);
