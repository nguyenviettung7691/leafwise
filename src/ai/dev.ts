
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-care-tips.ts';
// import '@/ai/flows/identify-plant.ts'; // Removed identify-plant flow
import '@/ai/flows/diagnose-plant-health.ts'; // Added new flow
import '@/ai/flows/generate-detailed-care-plan.ts'; // Added new flow for detailed care plan

