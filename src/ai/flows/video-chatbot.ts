'use server';
/**
 * @fileOverview A video chatbot AI agent.
 *
 * - videoChatbot - A function that handles the video chatbot process.
 * - VideoChatbotInput - The input type for the videoChatbot function.
 * - VideoChatbotOutput - The return type for the videoChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VideoChatbotInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  question: z.string().describe('The question about the video.'),
  videoSummary: z.string().describe('The summary of the video.'),
  chatHistory: z.string().optional().describe('The chat history.'),
});
export type VideoChatbotInput = z.infer<typeof VideoChatbotInputSchema>;

const VideoChatbotOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about the video.'),
});
export type VideoChatbotOutput = z.infer<typeof VideoChatbotOutputSchema>;

export async function videoChatbot(input: VideoChatbotInput): Promise<VideoChatbotOutput> {
  return videoChatbotFlow(input);
}

const prompt = ai.definePrompt({
  name: 'videoChatbotPrompt',
  input: {schema: VideoChatbotInputSchema},
  output: {schema: VideoChatbotOutputSchema},
  prompt: `You are a chatbot that answers questions about a video. Use the provided video and its summary to answer the user's question accurately. Prioritize information from the video itself over the summary if there is a conflict.

Video: {{media url=videoDataUri}}
Video Summary: {{{videoSummary}}}

Chat History:
{{{chatHistory}}}

Question: {{{question}}}

Answer:`,
});

const videoChatbotFlow = ai.defineFlow(
  {
    name: 'videoChatbotFlow',
    inputSchema: VideoChatbotInputSchema,
    outputSchema: VideoChatbotOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
