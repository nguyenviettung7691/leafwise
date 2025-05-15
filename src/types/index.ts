

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
  scientificName: string;
  commonName: string;
  species?: string;
  ageEstimate?: string; // e.g., "1 year", "6 months"
  healthCondition: PlantHealthCondition;
  location?: string; // e.g., "Living Room", "Balcony"
  plantingDate?: string; // ISO string
  customNotes?: string;
  primaryPhotoUrl?: string; // URL to the main photo for the plant card
  photos: PlantPhoto[];
  careTasks: CareTask[];
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
