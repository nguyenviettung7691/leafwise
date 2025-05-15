
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
  frequency?: string; // e.g., "Daily", "Weekly", "Every 2 weeks"
  lastCompleted?: string; // ISO string
  nextDueDate?: string; // ISO string
  isPaused: boolean;
  resumeDate?: string | null; // ISO string, date to resume notifications/task visibility
  type: 'basic' | 'advanced'; // Corresponds to care plan modes
}

export type PlantHealthCondition = 'healthy' | 'needs_attention' | 'sick' | 'unknown';

export interface Plant {
  id: string;
  scientificName?: string;
  commonName: string;
  familyCategory?: string; 
  ageEstimate?: string; 
  ageEstimateYears?: number; 
  healthCondition: PlantHealthCondition; // Overall current health condition of the plant
  location?: string; 
  plantingDate?: string; // ISO string - will be labeled as "Created Date"
  customNotes?: string;
  primaryPhotoUrl?: string; 
  photos: PlantPhoto[]; // Updated to store more detailed photo records for growth monitoring
  careTasks: CareTask[];
}

// Form data type
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


// Configuration for NavItems before translation
export interface NavItemConfig {
  titleKey: string; 
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

// NavItem structure after translation, used by UI components
export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

// New User type
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

// Types for the new comparePlantHealth flow
export interface ComparePlantHealthInput {
  currentPlantHealth: PlantHealthCondition;
  newPhotoDiagnosisNotes?: string; // Notes from the new photo's diagnosis
  newPhotoHealthStatus: PlantHealthCondition; // Health status from the new photo's diagnosis
}

export interface ComparePlantHealthOutput {
  comparisonSummary: string;
  shouldUpdateOverallHealth: boolean;
  suggestedOverallHealth?: PlantHealthCondition;
}
