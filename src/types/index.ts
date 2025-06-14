import type { Schema } from '../../amplify/data/resource';
import { z } from 'zod';
import { LucideProps } from 'lucide-react';

export type BackendPlant = Schema['Plant']['type'];
export type BackendPlantPhoto = Schema['PlantPhoto']['type'];
export type BackendCareTask = Schema['CareTask']['type'];
export type BackendUserPreferences = Schema['UserPreferences']['type'];
export type BackendPushSubscription = Schema['PushSubscription']['type'];

export type Plant = BackendPlant & {
  lastCaredDate?: string | null;
};
export type PlantPhoto = BackendPlantPhoto;
export type CareTask = BackendCareTask;
export type UserPreferences = BackendUserPreferences;
export type PushSubscription = BackendPushSubscription;

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
  description?: string | undefined;
  startDate: string; // Assuming ISO string
  frequencyMode: 'adhoc' | 'daily' | 'every_x_days' | 'weekly' | 'every_x_weeks' | 'monthly' | 'every_x_months' | 'yearly'; // Frontend specific frequency representation
  frequencyValue?: number | undefined;
  timeOfDayOption: 'specific_time' | 'all_day'; // Frontend specific time representation
  specificTime?: string | undefined;
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
    level?: 'basic' | 'advanced' | null;
}

export interface ExistingTaskModificationSuggestion {
    taskId: string;
    currentTaskName: string;
    suggestedAction: 'keep_as_is' | 'pause' | 'resume' | 'remove' | 'update_details';
    updatedDetails?: AITaskSuggestionDetails;
    reasoning?: string | null;
}

// Update the interface to match the AI flow's Zod schema for ReviewCarePlanInput
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

// CareTaskForAIReview is a frontend-specific type, potentially a subset of backend CareTask
// Ensure its fields align with the backend CareTask type alias
export interface CareTaskForAIReview {
    id: string;
    name: string;
    description?: string | undefined;
    frequency: string;
    timeOfDay?: string | undefined;
    isPaused: boolean;
    level: 'basic' | 'advanced';
}

// Explicitly type the input for the Genkit flow
export type DiagnosePlantHealthFlowInput = {
    photoDataUri: string;
    description?: string | null;
    languageCode?: string | null; 
};

export type DiagnosePlantHealthFlowOutput = {
    identification: {
        isPlant: boolean;
        commonName?: string | null;
        scientificName?: string | null;
        familyCategory?: string | null;
        ageEstimateYears?: number | null;
    };
    healthAssessment: {
        status: PlantHealthCondition;
        diagnosis?: string | null;
        confidence?: 'low' | 'medium' | 'high' | null; 
    };
    careRecommendations: Array<{
        action: string;
        details?: string | null;
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
  title?: string;
  href: string;
  icon: React.ComponentType<{ className?: string, size?: number }> | React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;
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
  originalTask: CareTask; 
  occurrenceDate: Date;
  plantId: string;
  plantName: string;
  plantPrimaryPhotoUrl?: string | null; 
}

export interface ComparePlantHealthInput {
    currentPlantHealth: PlantHealthCondition;
    newPhotoDiagnosisNotes?: string | undefined;
    newPhotoHealthStatus: PlantHealthCondition;
    languageCode?: string | undefined;
}

// Update the interface to match the AI flow's Zod schema for ProactiveCarePlanReviewInput
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