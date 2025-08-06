# **App Name**: VisionChat

## Core Features:

- Video Upload: Allows users to upload a video (mp4 or mov format, max 2 minutes).
- Video Trimming: Trims the video to a maximum duration of 2 minutes using moviepy or ffmpeg.
- Frame Extraction: Extracts key frames from the video using OpenCV (one frame every 5 seconds).
- Frame Captioning: Uses the BLIP model via HuggingFace Transformers to generate descriptive captions for each extracted frame. The LLM tool will try to determine appropriate context for the captions.
- Video Summarization: Combines the generated captions into a concise and readable summary of the video's content. The LLM tool may elide duplicate or similar material in the summary.
- Chatbot: Integrates LangChain with a local LLM (Llama 3 via Ollama) or cloud-based LLM (OpenAI/Gemini) to create a chatbot that answers questions about the video based on the summary. Stores chat history in a Python variable.
- Frontend UI: Provides a frontend interface using Gradio or Streamlit with sections for video upload, processing, captions display, summary display, and the chatbox.

## Style Guidelines:

- Primary color: A vibrant purple (#9D4EDD) to evoke a sense of creativity and visual processing.
- Background color: Light gray (#F0F0F0), a nearly white hue that doesn't distract from the interface.
- Accent color: A soft blue (#57A773) to highlight interactive elements like the process button and chat prompts, offering a visually distinct cue.
- Body and headline font: 'Inter' (sans-serif) for a modern and clean interface. A versatile font that maintains readability across various display contexts.
- Code font: 'Source Code Pro' (monospace) will be used when displaying code snippets or configurations within the app documentation.
- Clean and intuitive layout with clear separation of sections (Video Upload, Processing, Captions, Summary, Chatbox).
- Subtle loading animations and transitions when processing the video and generating captions/summaries.