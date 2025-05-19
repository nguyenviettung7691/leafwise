
import type { Plant, User } from '@/types';

const now = new Date();
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
const oneYearAgo = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
const twoYearsAgo = new Date(now.getTime() - 2 * 12 * 30 * 24 * 60 * 60 * 1000);

// Changed from const to let to allow reassignment for import feature
export let mockPlants: Plant[] = [
  {
    id: '1',
    commonName: 'Monstera Deliciosa',
    scientificName: 'Monstera deliciosa',
    familyCategory: 'Araceae',
    ageEstimate: '2 years',
    ageEstimateYears: 2,
    healthCondition: 'healthy',
    location: 'Living Room',
    plantingDate: twoYearsAgo.toISOString(),
    primaryPhotoUrl: 'https://placehold.co/600x400.png?text=Monstera',
    customNotes: 'Loves bright, indirect light. Water when top 2 inches of soil are dry.',
    photos: [
      { id: 'p1-initial', url: 'https://placehold.co/600x400.png?text=Monstera+Initial', dateTaken: twoYearsAgo.toISOString(), healthCondition: 'healthy', diagnosisNotes: 'Plant was healthy upon acquisition.' },
      { id: 'p1-1', url: 'https://placehold.co/600x400.png?text=Monstera+Month+11', dateTaken: oneYearAgo.toISOString(), healthCondition: 'healthy', diagnosisNotes: 'New leaf unfurling, looking good.' },
      { id: 'p1-2', url: 'https://placehold.co/600x400.png?text=Monstera+Today', dateTaken: oneWeekAgo.toISOString(), healthCondition: 'healthy', diagnosisNotes: 'Recently repotted, still vibrant.' },
    ],
    careTasks: [
      { id: 'ct1-1', plantId: '1', name: 'Watering', description: 'Water thoroughly until water drains from the bottom. Discard excess water.', frequency: 'Weekly', timeOfDay: '09:00', nextDueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, level: 'basic' },
      { id: 'ct1-2', plantId: '1', name: 'Fertilizing', description: 'Use a balanced liquid fertilizer, diluted to half strength.', frequency: 'Monthly', timeOfDay: '10:00', nextDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, level: 'advanced' },
    ],
    lastCaredDate: threeDaysAgo.toISOString(),
  },
  {
    id: '2',
    commonName: 'Snake Plant',
    scientificName: 'Sansevieria trifasciata',
    familyCategory: 'Asparagaceae',
    ageEstimate: '1 year',
    ageEstimateYears: 1,
    healthCondition: 'needs_attention',
    location: 'Bedroom',
    plantingDate: oneYearAgo.toISOString(),
    primaryPhotoUrl: 'https://placehold.co/600x400.png?text=Snake+Plant',
    customNotes: 'Very hardy, low light tolerant. Some yellowing on one leaf.',
    photos: [
      { id: 'p2-initial', url: 'https://placehold.co/600x400.png?text=Snake+Plant+Initial', dateTaken: oneYearAgo.toISOString(), healthCondition: 'healthy', diagnosisNotes: 'Healthy when planted.' },
      { id: 'p2-1', url: 'https://placehold.co/600x400.png?text=Snake+Plant+Today', dateTaken: oneWeekAgo.toISOString(), healthCondition: 'needs_attention', diagnosisNotes: 'Noticed slight yellowing on one leaf tip. Potentially overwatered last cycle.' },
    ],
    careTasks: [
      { id: 'ct2-1', plantId: '2', name: 'Watering', description: 'Allow soil to dry out completely between waterings.', frequency: 'Every 3 Weeks', timeOfDay: 'All day', nextDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, level: 'basic' },
    ],
    lastCaredDate: oneWeekAgo.toISOString(),
  },
  {
    id: '3',
    commonName: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    familyCategory: 'Moraceae',
    ageEstimate: '3 years',
    ageEstimateYears: 3,
    healthCondition: 'sick',
    location: 'Office',
    plantingDate: new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // Approx 3 years ago
    primaryPhotoUrl: 'https://placehold.co/600x400.png?text=Fiddle+Leaf',
    customNotes: 'Prefers consistent conditions. Has been dropping leaves and has brown spots.',
    photos: [
       { id: 'p3-initial', url: 'https://placehold.co/600x400.png?text=Fiddle+Leaf+Initial', dateTaken: new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), healthCondition: 'healthy', diagnosisNotes: 'Looked great when first bought.'},
       { id: 'p3-1', url: 'https://placehold.co/600x400.png?text=Fiddle+Leaf+Month+Ago', dateTaken: oneMonthAgo.toISOString(), healthCondition: 'needs_attention', diagnosisNotes: 'Started showing a few brown spots on lower leaves.'},
       { id: 'p3-2', url: 'https://placehold.co/600x400.png?text=Fiddle+Leaf+Today', dateTaken: oneWeekAgo.toISOString(), healthCondition: 'sick', diagnosisNotes: 'Significant leaf drop and more brown spots. Suspect root rot or severe stress.'},
    ],
    careTasks: [
      { id: 'ct3-1', plantId: '3', name: 'Watering', description: 'Check soil moisture deeply. Avoid letting it sit in water.', frequency: 'Weekly', timeOfDay: '08:00', nextDueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, level: 'basic' },
      { id: 'ct3-2', plantId: '3', name: 'Check for pests', description: 'Inspect leaves (top and bottom) and stems for any signs of pests.', frequency: 'Every 2 Weeks', timeOfDay: 'All day', nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), isPaused: true, resumeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), level: 'advanced' },
    ],
    lastCaredDate: twoWeeksAgo.toISOString(),
  },
  {
    id: '4',
    commonName: 'Spider Plant',
    scientificName: 'Chlorophytum comosum',
    familyCategory: 'Asparagaceae',
    ageEstimate: '0.5 years',
    ageEstimateYears: 0.5,
    healthCondition: 'healthy',
    location: 'Kitchen Window',
    plantingDate: sixMonthsAgo.toISOString(),
    primaryPhotoUrl: 'https://placehold.co/600x400.png?text=Spider+Plant',
    customNotes: 'Producing many spiderettes!',
    photos: [ { id: 'p4-initial', url: 'https://placehold.co/600x400.png?text=Spider+Plant+Initial', dateTaken: sixMonthsAgo.toISOString(), healthCondition: 'healthy', diagnosisNotes: 'Small but healthy.'}],
    careTasks: [
      { id: 'ct4-1', plantId: '4', name: 'Watering', description: 'Keep soil consistently moist but not soggy.', frequency: 'Every 5 Days', timeOfDay: 'All day', nextDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, level: 'basic' },
    ],
    lastCaredDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
  },
];

export const mockUser: User = {
  id: 'user123',
  name: 'Alex GreenThumb',
  email: 'alex.gt@example.com',
  avatarUrl: 'https://placehold.co/100x100.png',
  preferences: {
    emailNotifications: true,
    pushNotifications: false,
  },
};

    