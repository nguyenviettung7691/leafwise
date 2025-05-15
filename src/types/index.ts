
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
  name: string; // e.g., "Watering", "Fertilizing"
  description?: string;
  frequency: string; // e.g., "Daily", "Weekly", "Every 2 weeks", "Ad-hoc"
  timeOfDay?: string; // e.g., "14:30" or "All day"
  lastCompleted?: string; // ISO string
  nextDueDate?: string; // ISO string
  isPaused: boolean;
  resumeDate?: string | null; // ISO string, date to resume notifications/task visibility
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
  primaryPhotoUrl?: string;
  photos: PlantPhoto[];
  careTasks: CareTask[];
  lastCaredDate?: string; // New field
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
  frequencyMode: 'adhoc' | 'daily' | 'every_x_days' | 'weekly' | 'every_x_weeks' | 'monthly' | 'every_x_months' | 'yearly';
  frequencyValue?: number;
  timeOfDayOption: 'specific_time' | 'all_day';
  specificTime?: string;
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
