
import type { Plant, User } from '@/types';

const now = new Date();
const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
const oneYearAgo = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
const twoYearsAgo = new Date(now.getTime() - 2 * 12 * 30 * 24 * 60 * 60 * 1000);

// Renamed mockPlants to defaultPlants and made it const
export const defaultPlants: Plant[] = [
  // Default plants removed, array is now empty
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

    
