import { config } from 'dotenv';
config();

import '@/ai/flows/generate-care-tips.ts';
import '@/ai/flows/identify-plant.ts';
import '@/ai/flows/diagnose-plant-health.ts'; // Added new flow
