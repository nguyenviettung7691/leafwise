
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
  suggestedFrequency: string; // AI Should use "Daily", "Weekly", "Every X Days" etc.
  suggestedTimeOfDay: string; // AI Should use "All day" or "HH:MM"
  taskLevel: 'basic' | 'advanced';
}

export interface GenerateDetailedCarePlanOutput {
  generatedTasks: AIGeneratedTask[];
  customizableSchedulesPlaceholder: string;
  pushNotificationsPlaceholder: string;
  activityTrackingPlaceholder: string;
}

// For AI-driven care plan update suggestions
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

// Re-defining CareTaskForAI here to avoid circular dependency issues with the AI flow file.
// This is slightly redundant but safer for separation of concerns.
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
    currentCareTasks: CareTaskForAIReview[]; // Use the specifically defined type here
}


export interface NavItemConfig {
  titleKey: string; // Key for translation
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface NavItem {
  title: string; // Translated title
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface UserPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  // language?: 'en' | 'vi'; // Managed by LanguageContext now
  // darkMode?: boolean; // Managed by next-themes now
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

// Diagnose flow types, can be expanded
export interface ComparePlantHealthInput {
  currentPlantHealth: PlantHealthCondition;
  newPhotoDiagnosisNotes?: string; // textual diagnosis
  newPhotoHealthStatus: PlantHealthCondition; // 'healthy', 'needs_attention', 'sick' from new photo
}

export interface ComparePlantHealthOutput {
  comparisonSummary: string;
  shouldUpdateOverallHealth: boolean;
  suggestedOverallHealth?: PlantHealthCondition;
}

// Explicit types for DiagnosePlantHealth flow
export type DiagnosePlantHealthInput = {
    photoDataUri: string; // Data URI
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
        action: string; // e.g., "Adjust Watering", "Pest Control"
        details?: string;
    }>;
};

export type OnSaveTaskData = { // Type for data passed from CarePlanTaskForm
    name: string;
    description?: string;
    startDate: string; // This will be used as the nextDueDate
    frequency: string;
    timeOfDay: string;
    level: 'basic' | 'advanced';
};
