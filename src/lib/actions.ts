
'use server';

import { frameCaptioning } from '@/ai/flows/frame-captioning';
import { summarizeVideo } from '@/ai/flows/video-summarization';
import { videoChatbot, type VideoChatbotInput } from '@/ai/flows/video-chatbot';

export async function generateCaptionsAction(
  frameDataUris: string[]
): Promise<{ frame: string; caption: string }[]> {
  const captionPromises = frameDataUris.map(async (frameDataUri) => {
    const result = await frameCaptioning({ frameDataUri });
    return { frame: frameDataUri, caption: result.caption };
  });
  
  const results = await Promise.all(captionPromises);
  return results;
}

export async function generateSummaryAction(captions: string[]): Promise<string> {
  const result = await summarizeVideo({ captions });
  return result.summary;
}

export async function chatWithVideoAction(input: VideoChatbotInput): Promise<string> {
  const result = await videoChatbot(input);
  return result.answer;
}
