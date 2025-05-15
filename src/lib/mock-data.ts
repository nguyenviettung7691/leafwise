
import type { Plant, User, PlantPhoto } from '@/types';

const now = new Date();
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

export const mockPlants: Plant[] = [
  {
    id: '1',
    commonName: 'Monstera Deliciosa',
    scientificName: 'Monstera deliciosa',
    familyCategory: 'Araceae',
    ageEstimate: '2 years',
    healthCondition: 'healthy', // Overall health
    location: 'Living Room',
    plantingDate: new Date('2022-03-15').toISOString(),
    primaryPhotoUrl: 'https://placehold.co/600x400.png',
    customNotes: 'Loves bright, indirect light. Water when top 2 inches of soil are dry.',
    photos: [
      {
        id: 'p1-initial',
        url: 'https://placehold.co/600x400.png',
        dateTaken: new Date('2022-03-15').toISOString(),
        healthCondition: 'healthy',
        diagnosisNotes: 'Plant was healthy upon acquisition.'
      },
      {
        id: 'p1-1',
        url: 'https://placehold.co/600x400.png',
        dateTaken: oneMonthAgo.toISOString(),
        healthCondition: 'healthy',
        diagnosisNotes: 'New leaf unfurling, looking good.'
      },
      {
        id: 'p1-2',
        url: 'https://placehold.co/600x400.png',
        dateTaken: oneWeekAgo.toISOString(),
        healthCondition: 'healthy',
        diagnosisNotes: 'Recently repotted, still vibrant.'
      },
    ],
    careTasks: [
      { id: 'ct1-1', plantId: '1', name: 'Watering', frequency: 'Weekly', timeOfDay: '09:00', nextDueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, level: 'basic' },
      { id: 'ct1-2', plantId: '1', name: 'Fertilizing', frequency: 'Monthly', timeOfDay: '10:00', nextDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, level: 'advanced' },
    ],
  },
  {
    id: '2',
    commonName: 'Snake Plant',
    scientificName: 'Sansevieria trifasciata',
    familyCategory: 'Asparagaceae',
    ageEstimate: '1 year',
    healthCondition: 'needs_attention', // Overall health
    location: 'Bedroom',
    plantingDate: new Date('2023-01-20').toISOString(),
    primaryPhotoUrl: 'https://placehold.co/600x400.png',
    customNotes: 'Very hardy, low light tolerant. Some yellowing on one leaf.',
    photos: [
      {
        id: 'p2-initial',
        url: 'https://placehold.co/600x400.png',
        dateTaken: new Date('2023-01-20').toISOString(),
        healthCondition: 'healthy',
        diagnosisNotes: 'Healthy when planted.'
      },
      {
        id: 'p2-1',
        url: 'https://placehold.co/600x400.png',
        dateTaken: oneWeekAgo.toISOString(),
        healthCondition: 'needs_attention',
        diagnosisNotes: 'Noticed slight yellowing on one leaf tip. Potentially overwatered last cycle.'
      },
    ],
    careTasks: [
      { id: 'ct2-1', plantId: '2', name: 'Watering', frequency: 'Every 2-3 weeks', timeOfDay: 'All day', nextDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, level: 'basic' },
    ],
  },
  {
    id: '3',
    commonName: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    familyCategory: 'Moraceae',
    ageEstimate: '3 years',
    healthCondition: 'sick', // Overall health
    location: 'Office',
    plantingDate: new Date('2021-07-01').toISOString(),
    primaryPhotoUrl: 'https://placehold.co/600x400.png',
    customNotes: 'Prefers consistent conditions. Has been dropping leaves and has brown spots.',
    photos: [
       {
        id: 'p3-initial',
        url: 'https://placehold.co/600x400.png',
        dateTaken: new Date('2021-07-01').toISOString(),
        healthCondition: 'healthy',
        diagnosisNotes: 'Looked great when first bought.'
      },
      {
        id: 'p3-1',
        url: 'https://placehold.co/600x400.png',
        dateTaken: oneMonthAgo.toISOString(),
        healthCondition: 'needs_attention',
        diagnosisNotes: 'Started showing a few brown spots on lower leaves.'
      },
       {
        id: 'p3-2',
        url: 'https://placehold.co/600x400.png',
        dateTaken: oneWeekAgo.toISOString(),
        healthCondition: 'sick',
        diagnosisNotes: 'Significant leaf drop and more brown spots. Suspect root rot or severe stress.'
      },
    ],
    careTasks: [
      { id: 'ct3-1', plantId: '3', name: 'Watering', frequency: 'Weekly', timeOfDay: 'Morning', nextDueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, level: 'basic' },
      { id: 'ct3-2', plantId: '3', name: 'Check for pests', frequency: 'Bi-weekly', timeOfDay: 'Anytime', nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), isPaused: true, resumeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), level: 'advanced' },
    ],
  },
];

// Mock User Data
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
