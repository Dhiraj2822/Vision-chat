'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating descriptive captions for video frames.
 *
 * - frameCaptioning - The main function to generate captions for a given video frame data URI.
 * - FrameCaptioningInput - The input type for the frameCaptioning function, expects a data URI.
 * - FrameCaptioningOutput - The output type for the frameCaptioning function, returns a string caption.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FrameCaptioningInputSchema = z.object({
  frameDataUri: z
    .string()
    .describe(
      'A video frame as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Ensure proper documentation
    ),
});
export type FrameCaptioningInput = z.infer<typeof FrameCaptioningInputSchema>;

const FrameCaptioningOutputSchema = z.object({
  caption: z.string().describe('A descriptive caption of the video frame.'),
});
export type FrameCaptioningOutput = z.infer<typeof FrameCaptioningOutputSchema>;

export async function frameCaptioning(input: FrameCaptioningInput): Promise<FrameCaptioningOutput> {
  return frameCaptioningFlow(input);
}

const prompt = ai.definePrompt({
  name: 'frameCaptioningPrompt',
  input: {schema: FrameCaptioningInputSchema},
  output: {schema: FrameCaptioningOutputSchema},
  prompt: `You are an AI video analysis expert. Describe the contents of the following video frame.

Frame: {{media url=frameDataUri}}
`,
});

const frameCaptioningFlow = ai.defineFlow(
  {
    name: 'frameCaptioningFlow',
    inputSchema: FrameCaptioningInputSchema,
    outputSchema: FrameCaptioningOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
