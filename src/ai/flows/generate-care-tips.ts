// src/ai/flows/generate-care-tips.ts
'use server';

/**
 * @fileOverview Generates custom care tips for a given plant species and location.
 *
 * - generateCareTips - A function that generates plant care tips.
 * - GenerateCareTipsInput - The input type for the generateCareTips function.
 * - GenerateCareTipsOutput - The return type for the generateCareTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCareTipsInputSchema = z.object({
  plantSpecies: z.string().describe('The species of the plant.'),
  locationClimate: z.string().describe('The climate of the user\u2019s location.'),
});
export type GenerateCareTipsInput = z.infer<typeof GenerateCareTipsInputSchema>;

const GenerateCareTipsOutputSchema = z.object({
  careTips: z.string().describe('Customized care tips for the plant species in the given climate.'),
});
export type GenerateCareTipsOutput = z.infer<typeof GenerateCareTipsOutputSchema>;

export async function generateCareTips(input: GenerateCareTipsInput): Promise<GenerateCareTipsOutput> {
  return generateCareTipsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCareTipsPrompt',
  input: {schema: GenerateCareTipsInputSchema},
  output: {schema: GenerateCareTipsOutputSchema},
  prompt: `You are an expert in plant care.

  Based on the plant species: {{{plantSpecies}}} and the location's climate: {{{locationClimate}}}, generate custom care tips to ensure the plant thrives.
  Focus on essential aspects like watering, lighting, soil, and fertilization.
  Provide clear, actionable advice.
  `,
});

const generateCareTipsFlow = ai.defineFlow(
  {
    name: 'generateCareTipsFlow',
    inputSchema: GenerateCareTipsInputSchema,
    outputSchema: GenerateCareTipsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
