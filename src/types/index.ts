
export interface PlantPhoto {
  id: string;
  url: string; // This will now store the key/ID for IndexedDB retrieval
  notes?: string;
  dateTaken: string;
  healthCondition: PlantHealthCondition;
  diagnosisNotes?: string;
}

export interface CareTask {
  id: string;
  plantId: string;
  name: string;
  description?: string;
  frequency: string;
  timeOfDay?: string;
  lastCompleted?: string;
  nextDueDate?: string;
  isPaused: boolean;
  resumeDate?: string | null;
  level: 'basic' | 'advanced';
}

export type PlantHealthCondition = 'healthy' | 'needs_attention' | 'sick' | 'unknown';

export interface Plant {
  id: string;
  scientificName?: string;
  commonName: string;
  familyCategory?: string;
  ageEstimate?: string;
  ageEstimateYears?: number;
  healthCondition: PlantHealthCondition;
  location?: string;
  plantingDate?: string;
  customNotes?: string;
  primaryPhotoUrl?: string; // Will store the ID of the primary photo
  photos: PlantPhoto[];
  careTasks: CareTask[];
  lastCaredDate?: string;
}

export interface PlantFormData {
  commonName: string;
  scientificName?: string;
  familyCategory: string;
  ageEstimateYears?: number;
  healthCondition: PlantHealthCondition;
  location?: string;
  customNotes?: string;
  primaryPhoto?: FileList | null;
  diagnosedPhotoDataUrl?: string | null;
}

export type CarePlanTaskFormData = {
  name: string;
  description?: string;
  startDate: string;
  frequencyMode: 'adhoc' | 'daily' | 'every_x_days' | 'weekly' | 'every_x_weeks' | 'monthly' | 'every_x_months' | 'yearly';
  frequencyValue?: number;
  timeOfDayOption: 'specific_time' | 'all_day';
  specificTime?: string;
  level: 'basic' | 'advanced';
};

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
  pushNotificationsPlaceholder: string;
  activityTrackingPlaceholder: string;
}

export interface AITaskSuggestionDetails {
    name?: string;
    description?: string;
    frequency?: string;
    timeOfDay?: string;
    level?: 'basic' | 'advanced';
}

export interface ExistingTaskModificationSuggestion {
    taskId: string;
    currentTaskName: string;
    suggestedAction: 'keep_as_is' | 'pause' | 'resume' | 'remove' | 'update_details';
    updatedDetails?: AITaskSuggestionDetails;
    reasoning?: string;
}

export interface ReviewCarePlanOutput {
    overallAssessment: string;
    taskModifications: ExistingTaskModificationSuggestion[];
    newTasks: AIGeneratedTask[];
}

export interface CareTaskForAIReview {
    id: string;
    name: string;
    description?: string;
    frequency: string;
    timeOfDay?: string;
    isPaused: boolean;
    level: 'basic' | 'advanced';
}

// Explicitly type the input for the Genkit flow
export type DiagnosePlantHealthFlowInput = {
    photoDataUri: string;
    description?: string;
    languageCode?: string;
};

export type DiagnosePlantHealthFlowOutput = {
    identification: {
        isPlant: boolean;
        commonName?: string;
        scientificName?: string;
        familyCategory?: string;
        ageEstimateYears?: number;
    };
    healthAssessment: {
        isHealthy: boolean;
        diagnosis?: string;
        confidence?: 'low' | 'medium' | 'high';
    };
    careRecommendations: Array<{
        action: string;
        details?: string;
    }>;
};

export type OnSaveTaskData = {
    name: string;
    description?: string;
    startDate: string;
    frequency: string;
    timeOfDay: string;
    level: 'basic' | 'advanced';
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

export interface UserPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

// Updated User interface based on Cognito attributes
export interface User {
  id: string; // This will be the Cognito 'sub' (userId)
  name: string; // Cognito 'name' attribute
  email: string; // Cognito 'email' attribute
  // avatarUrl and preferences are removed as they are not standard Cognito attributes
  // If needed, they should be stored and fetched separately, e.g., via the Data API
}

export interface GlobalCalendarTaskOccurrence {
  originalTask: CareTask;
  occurrenceDate: Date;
  plantId: string;
  plantName: string;
  plantPrimaryPhotoUrl?: string;
}
