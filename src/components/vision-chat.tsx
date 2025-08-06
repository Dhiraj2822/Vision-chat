
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import Image from 'next/image';
import {
  Bot,
  User,
  SendHorizontal,
  Upload,
  Film,
  FileText,
  MessageSquare,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { generateCaptionsAction, generateSummaryAction, chatWithVideoAction } from '@/lib/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Frame {
  frame: string;
  caption: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_FRAMES = 10;

export function VisionChat() {
  const { toast } = useToast();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDataUri, setVideoDataUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [summary, setSummary] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      const chatViewport = chatContainerRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if(chatViewport) {
        chatViewport.scrollTop = chatViewport.scrollHeight;
      }
    }
  }, [chatHistory, isChatting]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024 * 1024) { // 200MB limit for browser stability
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload a video smaller than 200MB.',
      });
      return;
    }

    const videoUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(videoUrl);

    // Reset previous results
    setFrames([]);
    setSummary('');
    setChatHistory([]);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const extractFramesFromVideo = (videoEl: HTMLVideoElement, videoFile: File): Promise<{frames: string[], dataUri: string}> => {
    return new Promise(async (resolve, reject) => {
      try {
        const dataUri = await readFileAsDataURL(videoFile);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          return reject(new Error('Could not create canvas context.'));
        }

        videoEl.onloadedmetadata = async () => {
          if (videoEl.duration > 120) {
            return reject(new Error('Video duration exceeds 2 minutes.'));
          }
          canvas.width = videoEl.videoWidth;
          canvas.height = videoEl.videoHeight;
          
          const interval = Math.max(1, videoEl.duration / MAX_FRAMES);
          const framePromises: Promise<string>[] = [];

          for (let i = 0; i < MAX_FRAMES; i++) {
            const time = i * interval;
            if (time > videoEl.duration) break;
            
            framePromises.push(new Promise((resolveFrame, rejectFrame) => {
              const seekedListener = () => {
                try {
                  context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                  const frameData = canvas.toDataURL('image/jpeg');
                  videoEl.removeEventListener('seeked', seekedListener);
                  resolveFrame(frameData);
                } catch(e) {
                  rejectFrame(e);
                } finally {
                  setProcessingProgress(prev => prev + (40 / MAX_FRAMES));
                }
              };
              videoEl.addEventListener('seeked', seekedListener, { once: true });
              videoEl.currentTime = time;
            }));
          }

          try {
            const capturedFrames = await Promise.all(framePromises);
            resolve({frames: capturedFrames, dataUri});
          } catch(e) {
            reject(e);
          }
        };

        videoEl.onerror = () => reject(new Error('Failed to load video metadata.'));
        videoEl.src = URL.createObjectURL(videoFile);
        videoEl.load();

      } catch (error) {
        reject(error);
      }
    });
  };

  const handleProcessVideo = async () => {
    if (!videoFile || !videoRef.current) {
      toast({
        variant: 'destructive',
        title: 'No video selected',
        description: 'Please upload a video file first.',
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Initializing...');
    setProcessingProgress(0);

    try {
      setProcessingStatus('Extracting key frames...');
      const { frames: extractedFrames, dataUri } = await extractFramesFromVideo(videoRef.current, videoFile);
      setVideoDataUri(dataUri);

      if (extractedFrames.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Frame extraction failed',
            description: 'Could not extract any frames from the video. Please try a different video.',
          });
        setIsProcessing(false);
        return;
      }
      setProcessingProgress(40);

      setProcessingStatus('Generating captions...');
      const captionResults = await generateCaptionsAction(extractedFrames);
      setFrames(captionResults);
      setProcessingProgress(80);

      setProcessingStatus('Creating summary...');
      const captions = captionResults.map((f) => f.caption);
      const summaryResult = await generateSummaryAction(captions);
      setSummary(summaryResult);
      setProcessingProgress(100);

      setProcessingStatus('Analysis complete!');
      setTimeout(() => setIsProcessing(false), 1500);

    } catch (error) {
      const e = error as Error;
      toast({
        variant: 'destructive',
        title: 'Processing failed',
        description: e.message || 'An unknown error occurred.',
      });
      setIsProcessing(false);
    }
  };

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || !summary || !videoDataUri) return;

    const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', content: userQuestion }];
    setChatHistory(newHistory);
    setUserQuestion('');
    setIsChatting(true);

    try {
      const formattedHistory = newHistory
        .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
      
      const answer = await chatWithVideoAction({
        videoDataUri,
        question: userQuestion,
        videoSummary: summary,
        chatHistory: formattedHistory,
      });

      setChatHistory([...newHistory, { role: 'assistant', content: answer }]);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Chat error',
        description: 'Could not get a response from the assistant.',
      });
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary font-headline flex items-center justify-center gap-3">
          <Film className="w-10 h-10" />
          VisionChat
        </h1>
        <p className="text-muted-foreground mt-2">
          Upload a short video to get an AI-powered analysis and chat about its contents.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="text-primary" /> 1. Upload & Process
            </CardTitle>
            <CardDescription>
              Select a video file (.mp4, .mov, max 2 mins).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label
                htmlFor="video-upload"
                className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors"
              >
                {videoUrl ? (
                  <video ref={videoRef} src={videoUrl} controls className="w-full h-full object-contain rounded-lg" muted playsInline/>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                    <Film className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">MP4 or MOV (MAX. 2min / 200MB)</p>
                  </div>
                )}
                <Input
                  id="video-upload"
                  type="file"
                  className="sr-only"
                  accept="video/mp4,video/mov"
                  onChange={handleVideoUpload}
                  disabled={isProcessing}
                />
              </label>
              <Button onClick={handleProcessVideo} disabled={!videoFile || isProcessing} className="w-full">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isProcessing ? 'Processing...' : 'Process Video'}
              </Button>
            </div>
            {isProcessing && (
              <div className="mt-4 space-y-2">
                <Progress value={processingProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">{processingStatus}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis" disabled={frames.length === 0}>
              <FileText className="mr-2 h-4 w-4" /> Analysis
            </TabsTrigger>
            <TabsTrigger value="chat" disabled={!summary}>
              <MessageSquare className="mr-2 h-4 w-4" /> Chat
            </TabsTrigger>
          </TabsList>
          <TabsContent value="analysis">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Frames & Captions</CardTitle>
                </CardHeader>
                <CardContent>
                  {isProcessing && frames.length === 0 ? (
                     <Carousel className="w-full max-w-sm mx-auto">
                        <CarouselContent>
                          <CarouselItem><Skeleton className="h-48 w-full" /></CarouselItem>
                        </CarouselContent>
                      </Carousel>
                  ) : frames.length > 0 ? (
                    <Carousel className="w-full max-w-md mx-auto" opts={{ loop: true }}>
                      <CarouselContent>
                        {frames.map((frame, index) => (
                          <CarouselItem key={index}>
                            <div className="p-1">
                                <Image
                                  src={frame.frame}
                                  alt={`Frame ${index + 1}`}
                                  width={1280}
                                  height={720}
                                  className="rounded-lg object-contain aspect-video"
                                />
                                <p className="mt-2 text-center text-sm text-muted-foreground font-code p-2 bg-muted rounded-md">
                                  {frame.caption}
                                </p>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      Process a video to see key frames and captions here.
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Video Summary</CardTitle>
                </CardHeader>
                <CardContent>
                   {isProcessing && !summary ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  ) : summary ? (
                    <p className="text-sm text-foreground">{summary}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">
                      Process a video to see the summary here.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>Chat with VisionBot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex flex-col">
                  <ScrollArea className="flex-grow h-0" ref={chatContainerRef}>
                    <div className="space-y-4 p-4">
                      {chatHistory.length > 0 ? (
                        chatHistory.map((message, index) => (
                          <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                            {message.role === 'assistant' && (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`rounded-lg p-3 max-w-sm ${
                                message.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                             {message.role === 'user' && (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-10">
                          <MessageSquare className="mx-auto h-8 w-8 mb-2" />
                          <p>Ask a question about the video summary.</p>
                        </div>
                      )}
                      {isChatting && (
                         <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                            <div className="rounded-lg p-3 max-w-sm bg-muted flex items-center">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                            </div>
                         </div>
                      )}
                    </div>
                  </ScrollArea>
                  <form onSubmit={handleChatSubmit} className="flex items-center gap-2 border-t p-4">
                    <Input
                      value={userQuestion}
                      onChange={(e) => setUserQuestion(e.target.value)}
                      placeholder="Ask about the video..."
                      disabled={isChatting}
                    />
                    <Button type="submit" size="icon" disabled={isChatting || !userQuestion.trim()}>
                      <SendHorizontal className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
