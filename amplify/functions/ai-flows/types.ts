/**
 * Standalone AI types for the Lambda function.
 * These mirror the relevant types from src/types/index.ts but have no @/ or Amplify Schema dependencies.
 */

export type PlantHealthCondition = 'healthy' | 'needs_attention' | 'sick' | 'unknown';

export interface AIGeneratedTask {
  taskName: string;
  taskDescription: string;
  suggestedFrequency: string;
  suggestedTimeOfDay: string;
  taskLevel: 'basic' | 'advanced';
}

export interface GenerateDetailedCarePlanOutput {
  generatedTasks: AIGeneratedTask[];
  customizableSchedulesPlaceholder: string;
}

export interface AITaskSuggestionDetails {
  name?: string | null;
  description?: string | null;
  frequency?: string | null;
  timeOfDay?: string | null;
  level?: 'basic' | 'advanced' | null;
}

export interface ExistingTaskModificationSuggestion {
  taskId: string;
  currentTaskName: string;
  suggestedAction: 'keep_as_is' | 'pause' | 'resume' | 'remove' | 'update_details';
  updatedDetails?: AITaskSuggestionDetails;
  reasoning?: string | null;
}

export interface CareTaskForAIReview {
  id: string;
  name: string;
  description?: string | undefined;
  frequency: string;
  timeOfDay?: string | undefined;
  isPaused: boolean;
  level: 'basic' | 'advanced';
}

export interface ReviewCarePlanInput {
  plantCommonName: string;
  newPhotoDiagnosisNotes: string;
  newPhotoHealthStatus: PlantHealthCondition;
  currentCareTasks: CareTaskForAIReview[];
  languageCode?: string | undefined;
}

export interface ReviewCarePlanOutput {
  overallAssessment: string;
  taskModifications: ExistingTaskModificationSuggestion[];
  newTasks: AIGeneratedTask[];
}

export interface ComparePlantHealthInput {
  currentPlantHealth: PlantHealthCondition;
  newPhotoDiagnosisNotes?: string | undefined;
  newPhotoHealthStatus: PlantHealthCondition;
  languageCode?: string | undefined;
}

export interface ComparePlantHealthOutput {
  comparisonSummary: string;
  shouldUpdateOverallHealth: boolean;
  suggestedOverallHealth?: PlantHealthCondition;
}

export interface ProactiveCarePlanReviewInput {
  plantCommonName?: string | null;
  plantScientificName?: string | null;
  plantFamilyCategory?: string | null;
  plantAgeEstimateYears?: number | null;
  currentPlantHealth: PlantHealthCondition;
  plantCustomNotes?: string | null;
  currentCareTasks: CareTaskForAIReview[];
  languageCode?: string | undefined;
}
