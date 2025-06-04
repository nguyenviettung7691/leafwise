import type { Schema } from '../../amplify/data/resource';
import { z } from 'zod'; // Import z from zod

export type BackendPlant = Schema['Plant']['type'];
export type BackendPlantPhoto = Schema['PlantPhoto']['type'];
export type BackendCareTask = Schema['CareTask']['type'];
export type BackendUserPreferences = Schema['UserPreferences']['type'];

export type Plant = BackendPlant & {
  lastCaredDate?: string | null;
};
export type PlantPhoto = BackendPlantPhoto;
export type CareTask = BackendCareTask;
export type UserPreferences = BackendUserPreferences;

export type PlantHealthCondition = 'healthy' | 'needs_attention' | 'sick' | 'unknown';

export interface PlantFormData {
  commonName: string;
  scientificName?: string;
  familyCategory: string;
  ageEstimateYears?: number | null; 
  healthCondition: PlantHealthCondition;
  location?: string; 
  customNotes?: string;
  primaryPhoto?: FileList | null;
  diagnosedPhotoDataUrl?: string | null;
}

const plantFormSchemaStructure = {
  commonName: z.string().min(1),
  scientificName: z.string().optional(),
  familyCategory: z.string().min(1),
  ageEstimateYears: z.coerce.number().min(0).optional().nullable(),
  healthCondition: z.enum(['healthy', 'needs_attention', 'sick', 'unknown']),
  location: z.string().optional(),
  customNotes: z.string().optional(),
  primaryPhoto: typeof window !== 'undefined' ? z.instanceof(FileList).optional().nullable() : z.any().optional().nullable(),
  diagnosedPhotoDataUrl: z.string().optional().nullable(),
};

export type SavePlantFormValues = z.infer<z.ZodObject<typeof plantFormSchemaStructure>>;

export type CarePlanTaskFormData = {
  name: string;
  description?: string | null; // Allow null
  startDate: string; // Assuming ISO string
  frequencyMode: 'adhoc' | 'daily' | 'every_x_days' | 'weekly' | 'every_x_weeks' | 'monthly' | 'every_x_months' | 'yearly'; // Frontend specific frequency representation
  frequencyValue?: number | null; // Allow null
  timeOfDayOption: 'specific_time' | 'all_day'; // Frontend specific time representation
  specificTime?: string | null; // Allow null (e.g., "HH:MM")
  level: 'basic' | 'advanced'; // Frontend specific level representation, maps to backend string
};

export interface AIGeneratedTask {
  taskName: string;
  taskDescription: string;
  suggestedFrequency: string; // AI output format, needs mapping to backend frequency
  suggestedTimeOfDay: string; // AI output format, needs mapping to backend timeOfDay
  taskLevel: 'basic' | 'advanced'; // AI output format, maps to backend string
}

export interface GenerateDetailedCarePlanOutput {
  generatedTasks: AIGeneratedTask[];
  customizableSchedulesPlaceholder: string;
  pushNotificationsPlaceholder: string;
  activityTrackingPlaceholder: string;
}

export interface AITaskSuggestionDetails {
    name?: string | null;
    description?: string | null;
    frequency?: string | null;
    timeOfDay?: string | null;
    level?: 'basic' | 'advanced' | null; // Allow null
}

export interface ExistingTaskModificationSuggestion {
    taskId: string;
    currentTaskName: string;
    suggestedAction: 'keep_as_is' | 'pause' | 'resume' | 'remove' | 'update_details';
    updatedDetails?: AITaskSuggestionDetails;
    reasoning?: string | null; // Allow null
}

export interface ReviewCarePlanInput {
    plantCommonName: string; // Changed from optional/nullable to required string
    newPhotoDiagnosisNotes: string; // Changed from optional/nullable to required string
    newPhotoHealthStatus: PlantHealthCondition; // Frontend specific type
    currentCareTasks: CareTaskForAIReview[]; // Frontend specific type for AI review
    languageCode?: string | null; // Allow null
}

export interface ReviewCarePlanOutput {
    overallAssessment: string;
    taskModifications: ExistingTaskModificationSuggestion[];
    newTasks: AIGeneratedTask[];
}

// CareTaskForAIReview is a frontend-specific type, potentially a subset of backend CareTask
// Ensure its fields align with the backend CareTask type alias
export interface CareTaskForAIReview {
    id: string;
    name: string;
    description?: string | null; // Allow null
    frequency: string;
    timeOfDay?: string | null; // Allow null
    isPaused: boolean;
    level: 'basic' | 'advanced'; // Maps to backend string
}

// Explicitly type the input for the Genkit flow
export type DiagnosePlantHealthFlowInput = {
    photoDataUri: string;
    description?: string | null; // Allow null
    languageCode?: string | null; // Allow null
};

export type DiagnosePlantHealthFlowOutput = {
    identification: {
        isPlant: boolean;
        commonName?: string | null; // Allow null
        scientificName?: string | null; // Allow null
        familyCategory?: string | null; // Allow null
        ageEstimateYears?: number | null; // Allow null
    };
    healthAssessment: {
        isHealthy: boolean;
        diagnosis?: string | null; // Allow null
        confidence?: 'low' | 'medium' | 'high' | null; // Allow null
    };
    careRecommendations: Array<{
        action: string;
        details?: string | null; // Allow null
    }>;
};

export type OnSaveTaskData = {
    name: string;
    description?: string | null; // Allow null
    startDate: string; // Assuming ISO string
    frequency: string; // Maps to backend string
    timeOfDay?: string | null; // Maps to backend string
    level: 'basic' | 'advanced'; // Maps to backend string
};

export interface NavItemConfig {
  titleKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

// User interface based on Cognito attributes and UserPreferences model
// Keep this as it combines Cognito attributes with Data model preferences
export interface User {
  id: string; // This will be the Cognito 'sub' (userId)
  name: string; // Cognito 'name' attribute
  email: string; // Cognito 'email' attribute
  avatarS3Key?: string | null; // S3 key for avatar, stored in UserPreferences model
  preferences?: UserPreferences | null; // User preferences, stored in UserPreferences model
}

// GlobalCalendarTaskOccurrence uses backend types
// Use the type alias created above
export interface GlobalCalendarTaskOccurrence {
  originalTask: CareTask; // Use backend type alias
  occurrenceDate: Date;
  plantId: string;
  plantName: string;
  plantPrimaryPhotoUrl?: string | null; // Allow null
}

export interface ComparePlantHealthInput {
    currentPlantHealth: PlantHealthCondition;
    newPhotoDiagnosisNotes?: string | null | undefined; // Allow null
    newPhotoHealthStatus: PlantHealthCondition;
    languageCode?: string | null | undefined; // Allow null
}

// ProactiveCarePlanReviewInput uses backend types where appropriate
// Use the type aliases created above
export interface ProactiveCarePlanReviewInput {
    plantCommonName?: string | null; // Allow null
    plantScientificName?: string | null; // Allow null
    plantFamilyCategory?: string | null; // Allow null
    plantAgeEstimateYears?: number | null; // Allow null
    currentPlantHealth: PlantHealthCondition; // Frontend specific type
    plantCustomNotes?: string | null; // Allow null
    currentCareTasks: CareTaskForAIReview[]; // This type is frontend specific, keep it
    languageCode?: string | null; // Allow null
}