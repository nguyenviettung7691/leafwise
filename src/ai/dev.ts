
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-care-tips.ts';
import '@/ai/flows/diagnose-plant-health.ts'; 
import '@/ai/flows/generate-detailed-care-plan.ts'; 
import '@/ai/flows/compare-plant-health.ts'; // Added new flow for health comparison

