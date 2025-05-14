import type { Plant } from '@/types';

export const mockPlants: Plant[] = [
  {
    id: '1',
    commonName: 'Monstera Deliciosa',
    scientificName: 'Monstera deliciosa',
    species: 'Araceae',
    ageEstimate: '2 years',
    healthCondition: 'healthy',
    location: 'Living Room',
    plantingDate: new Date('2022-03-15').toISOString(),
    primaryPhotoUrl: 'https://placehold.co/600x400.png',
    customNotes: 'Loves bright, indirect light. Water when top 2 inches of soil are dry.',
    photos: [
      { id: 'p1-1', url: 'https://placehold.co/600x400.png', dateTaken: new Date('2023-01-10').toISOString(), notes: 'New leaf unfurling' },
      { id: 'p1-2', url: 'https://placehold.co/600x400.png', dateTaken: new Date('2023-06-22').toISOString(), notes: 'After repotting' },
    ],
    careTasks: [
      { id: 'ct1-1', plantId: '1', name: 'Watering', frequency: 'Weekly', nextDueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, type: 'basic' },
      { id: 'ct1-2', plantId: '1', name: 'Fertilizing', frequency: 'Monthly', nextDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, type: 'advanced' },
    ],
  },
  {
    id: '2',
    commonName: 'Snake Plant',
    scientificName: 'Sansevieria trifasciata',
    species: 'Asparagaceae',
    ageEstimate: '1 year',
    healthCondition: 'healthy',
    location: 'Bedroom',
    plantingDate: new Date('2023-01-20').toISOString(),
    primaryPhotoUrl: 'https://placehold.co/600x400.png',
    customNotes: 'Very hardy, low light tolerant. Do not overwater.',
    photos: [
      { id: 'p2-1', url: 'https://placehold.co/600x400.png', dateTaken: new Date('2023-02-15').toISOString() },
    ],
    careTasks: [
      { id: 'ct2-1', plantId: '2', name: 'Watering', frequency: 'Every 2-3 weeks', nextDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, type: 'basic' },
    ],
  },
  {
    id: '3',
    commonName: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    species: 'Moraceae',
    ageEstimate: '3 years',
    healthCondition: 'needs_attention',
    location: 'Office',
    plantingDate: new Date('2021-07-01').toISOString(),
    primaryPhotoUrl: 'https://placehold.co/600x400.png',
    customNotes: 'Prefers consistent conditions. Dropped a few leaves recently.',
    photos: [],
    careTasks: [
      { id: 'ct3-1', plantId: '3', name: 'Watering', frequency: 'Weekly', nextDueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), isPaused: false, type: 'basic' },
      { id: 'ct3-2', plantId: '3', name: 'Check for pests', frequency: 'Bi-weekly', nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), isPaused: true, resumeDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), type: 'advanced' },
    ],
  },
];
