
'use server';

/**
 * @fileOverview A video summarization AI agent.
 *
 * - summarizeVideo - A function that handles the video summarization process.
 * - SummarizeVideoInput - The input type for the summarizeVideo function.
 * - SummarizeVideoOutput - The return type for the summarizeVideo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeVideoInputSchema = z.object({
  captions: z.array(z.string()).describe('An array of captions for the key frames of the video.'),
});
export type SummarizeVideoInput = z.infer<typeof SummarizeVideoInputSchema>;

const SummarizeVideoOutputSchema = z.object({
  summary: z.string().describe('A concise and readable summary of the video content.'),
});
export type SummarizeVideoOutput = z.infer<typeof SummarizeVideoOutputSchema>;

export async function summarizeVideo(input: SummarizeVideoInput): Promise<SummarizeVideoOutput> {
  return summarizeVideoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeVideoPrompt',
  input: {schema: SummarizeVideoInputSchema},
  output: {schema: SummarizeVideoOutputSchema},
  prompt: `You are an expert video summarizer. You will be provided with a list of captions extracted from key frames of a video. Your task is to combine these captions into a concise, engaging, and readable summary of the video's content. Elide duplicate or similar material. Focus on creating a narrative flow.

Captions:\n{{#each captions}}- {{{this}}}\n{{/each}}`,
});

const summarizeVideoFlow = ai.defineFlow(
  {
    name: 'summarizeVideoFlow',
    inputSchema: SummarizeVideoInputSchema,
    outputSchema: SummarizeVideoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    