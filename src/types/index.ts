
export interface PlantPhoto {
  id: string;
  url: string;
  notes?: string; // General notes for the photo
  dateTaken: string; // ISO string - This will be the date of diagnosis/photo upload
  healthCondition: PlantHealthCondition; // Health condition AT THE TIME of this photo/diagnosis
  diagnosisNotes?: string; // Specific diagnosis notes from AI for this photo
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
  plantingDate?: string; // ISO String
  customNotes?: string;
  primaryPhotoUrl?: string;
  photos: PlantPhoto[];
  careTasks: CareTask[];
  lastCaredDate?: string; // ISO String
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
  diagnosedPhotoDataUrl?: string | null; // Used for pre-filling or when a gallery photo is selected
}

export type CarePlanTaskFormData = {
  name: string;
  description?: string;
  startDate: string; // ISO string for the first due date
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

export interface ReviewCarePlanInput {
    plantCommonName: string;
    newPhotoDiagnosisNotes: string;
    newPhotoHealthIsHealthy: boolean;
    currentCareTasks: CareTaskForAIReview[];
}

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

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

export interface ComparePlantHealthInput {
  currentPlantHealth: PlantHealthCondition;
  newPhotoDiagnosisNotes?: string;
  newPhotoHealthStatus: PlantHealthCondition;
}

export interface ComparePlantHealthOutput {
  comparisonSummary: string;
  shouldUpdateOverallHealth: boolean;
  suggestedOverallHealth?: PlantHealthCondition;
}

export type DiagnosePlantHealthInput = {
    photoDataUri: string;
    description?: string;
};

export type DiagnosePlantHealthOutput = {
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

// This specific type for the global calendar component
export interface GlobalCalendarTaskOccurrence {
  originalTask: CareTask;
  occurrenceDate: Date;
  plantId: string;
  plantName: string;
  plantPrimaryPhotoUrl?: string;
}
