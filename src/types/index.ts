
export interface PlantPhoto {
  id: string;
  url: string;
  notes?: string;
  dateTaken: string; // ISO string
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
  scientificName?: string; // Made optional to align with form
  commonName: string;
  familyCategory?: string; // Made optional to align with form, though form will require it
  species?: string; // Kept for broader classification if needed elsewhere
  ageEstimate?: string; // e.g., "1 year", "6 months" - string representation
  ageEstimateYears?: number; // Numerical representation for form
  healthCondition: PlantHealthCondition;
  location?: string; // e.g., "Living Room", "Balcony"
  plantingDate?: string; // ISO string
  customNotes?: string;
  primaryPhotoUrl?: string; // URL to the main photo for the plant card
  photos: PlantPhoto[];
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
  // This will store the data URI of the diagnosed image if no new image is selected
  diagnosedPhotoDataUrl?: string | null; 
}


// Configuration for NavItems before translation
export interface NavItemConfig {
  titleKey: string; // Key for translation
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
  pushNotifications?: boolean; // Added pushNotifications
  // themePreference?: 'light' | 'dark' | 'system'; // Example for theme
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
}
