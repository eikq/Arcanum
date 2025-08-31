import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeMicState, acquireMic, reacquireMic, type MicState } from '@/audio/MicBootstrap';
import { applySpellGrammar } from '@/engine/recognition/SRGrammar';

export type SRResult = { transcript: string; isFinal: boolean; alt?: string[] };

export interface UseSpeechRecognition {
  start: () => Promise<void>;
  stop: () => void;
  restart: () => Promise<void>;
  listening: boolean;
  supported: boolean;
  hasPermission: boolean;
  interim?: string;
  final?: string;
  error?: string;
  dbfs: number;
  rms: () => number;
  micDenied: boolean;
  onInterim?: (t: string) => void;
  onFinal?: (t: string) => void;
  
  // Legacy compatibility
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
  loudness: number;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggle: () => void;
  resetTranscript: () => void;
  primeMic: (deviceId?: string) => Promise<MediaStream>;
  autoStartListening: () => Promise<void>;
}

interface VoiceRecognitionOptions {
  hotwordEnabled?: boolean;
  hotword?: string;
  onInterim?: (transcript: string) => void;
  onFinal?: (transcript: string) => void;
}

export const useVoiceRecognition = (
  onResult?: (transcript: string, confidence: number, loudness: number) => void,
  hotwordEnabled = false,
  hotword = 'arcanum',
  onInterimCallback?: (transcript: string) => void,
  onFinalCallback?: (transcript: string) => void
): UseSpeechRecognition => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [interim, setInterim] = useState<string>();
  const [final, setFinal] = useState<string>();
  const [error, setError] = useState<string>();
  const [dbfs, setDbfs] = useState(-60);
  const [micDenied, setMicDenied] = useState(false);
  
  // Legacy state
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [loudness, setLoudness] = useState(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const micStateRef = useRef<MicState | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const micStateUnsubscribeRef = useRef<(() => void) | null>(null);
  const isStartingRef = useRef(false);
  const shouldBeListeningRef = useRef(false);
  const lastResultTimeRef = useRef(0);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 3;

      // Apply spell grammar boost (safe fallback if unsupported)
      applySpellGrammar(recognition);

      recognitionRef.current = recognition;

      // Speech recognition event handlers
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setListening(true);
        setError(undefined);
        isStartingRef.current = false;
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setListening(false);
        isStartingRef.current = false;
        
        // Only auto-restart if we should still be listening and it's been more than 100ms since last result
        const timeSinceLastResult = Date.now() - lastResultTimeRef.current;
        if (shouldBeListeningRef.current && timeSinceLastResult > 100 && !isStartingRef.current) {
          console.log('Auto-restarting speech recognition...');
          if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
          restartTimeoutRef.current = setTimeout(async () => {
            if (shouldBeListeningRef.current && !isStartingRef.current && recognitionRef.current) {
              try {
                isStartingRef.current = true;
                recognitionRef.current.start();
              } catch (error) {
                console.warn('Auto-restart failed:', error);
                isStartingRef.current = false;
              }
            }
          }, 200);
        }
      };

      recognition.onerror = (event) => {
        console.log('Speech recognition error:', event.error);
        isStartingRef.current = false;
        
        if (event.error === 'not-allowed') {
          setHasPermission(false);
          setListening(false);
          setMicDenied(true);
          setError('Microphone permission denied');
          shouldBeListeningRef.current = false;
        } else if (event.error === 'no-speech') {
          // This is normal, don't treat as error
          console.log('No speech detected, continuing...');
        } else if (event.error === 'aborted') {
          // Manual stop, don't restart
          shouldBeListeningRef.current = false;
        } else {
          console.warn('Speech recognition error:', event.error);
          // Don't set error state for common issues, just log them
        }
      };

      recognition.onresult = (event) => {
        lastResultTimeRef.current = Date.now();
        const results = event.results;
        let interimTranscript = '';
        let finalTranscript = '';
        
        // Process all results
        for (let i = event.resultIndex; i < results.length; i++) {
          const result = results[i];
          const transcript = result[0].transcript.trim();
          
          if (result.isFinal) {
            const confidence = result[0].confidence || 0.9;
            finalTranscript = transcript;
            
            console.log('Final transcript:', transcript, 'confidence:', confidence);
            
            // Update final transcript
            setFinal(transcript);
            setTranscript(transcript);
            setConfidence(confidence);
            
            // Call callbacks with proper parameters
            if (onFinalCallback) {
              const currentRms = micStateRef.current?.rms || 0;
              const currentDbfs = micStateRef.current?.dbfs || -60;
              onFinalCallback(transcript, currentRms, currentDbfs);
            }
            if (onResult) {
              onResult(transcript, confidence, loudness);
            }

            // Clear interim after final
            setInterim('');
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update interim transcript
        if (interimTranscript) {
          setInterim(interimTranscript);
          if (onInterimCallback) {
            const currentRms = micStateRef.current?.rms || 0;
            const currentDbfs = micStateRef.current?.dbfs || -60;
            onInterimCallback(interimTranscript, currentRms, currentDbfs);
          }
        }
      };
    } else {
      console.warn('Speech recognition not supported');
      setSupported(false);
    }

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [onInterimCallback, onFinalCallback, onResult, loudness]);

  // Subscribe to mic state changes
  useEffect(() => {
    const unsubscribe = subscribeMicState((micState: MicState) => {
      micStateRef.current = micState;
      setDbfs(micState.dbfs);
      setLoudness(micState.rms);
      
      // Update permission state based on mic state
      if (micState.ready === 'ready') {
        setHasPermission(true);
        setMicDenied(false);
      } else if (micState.ready === 'error') {
        setHasPermission(false);
        setMicDenied(true);
      }
    });

    micStateUnsubscribeRef.current = unsubscribe;
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Prime microphone
  const primeMic = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    try {
      console.log('Priming microphone...');
      
      // Check for secure origin
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      if (!isSecure) {
        throw new Error('Microphone requires secure origin (HTTPS)');
      }

      const micState = await acquireMic(deviceId);
      
      if (micState.stream) {
        setHasPermission(true);
        setMicDenied(false);
        setError(undefined);
        console.log('Microphone primed successfully');
        return micState.stream;
      } else {
        throw new Error('Failed to acquire microphone stream');
      }
    } catch (error) {
      console.error('Failed to prime microphone:', error);
      setHasPermission(false);
      setMicDenied(true);
      setError(error instanceof Error ? error.message : 'Microphone error');
      throw error;
    }
  }, []);

  // Start listening
  const start = useCallback(async () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }
    
    // Don't start if already listening or starting
    if (listening || isStartingRef.current) {
      console.log('Already listening or starting, skipping...');
      return;
    }
    
    console.log('Starting speech recognition...');
    shouldBeListeningRef.current = true;
    
    if (!hasPermission) {
      try {
        await primeMic();
      } catch (error) {
        console.error('Failed to prime mic before starting:', error);
        return;
      }
    }
    
    try {
      isStartingRef.current = true;
      recognitionRef.current.start();
      setError(undefined);
    } catch (error) {
      isStartingRef.current = false;
      if (error instanceof Error && !error.message.includes('already started')) {
        console.error('Failed to start speech recognition:', error);
        setError(error.message);
      }
    }
  }, [hasPermission, primeMic, listening]);

  // Stop listening
  const stop = useCallback(() => {
    console.log('Stopping speech recognition...');
    shouldBeListeningRef.current = false;
    isStartingRef.current = false;
    setListening(false);
    
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        // Ignore errors when stopping
        console.warn('Error stopping speech recognition:', error);
      }
    }
  }, []);

  // Restart with proper cleanup
  const restart = useCallback(async () => {
    console.log('Restarting speech recognition...');
    stop();
    
    // Wait a bit longer for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reset state
    setError(undefined);
    setInterim('');
    setFinal('');
    
    await start();
  }, [start, stop]);

  // RMS getter
  const rms = useCallback(() => {
    return micStateRef.current?.rms ?? 0;
  }, []);

  // Reset function to clear all state
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setFinal('');
    setInterim('');
    setConfidence(0);
    lastResultTimeRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldBeListeningRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (micStateUnsubscribeRef.current) {
        micStateUnsubscribeRef.current();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Legacy compatibility methods
  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  const autoStartListening = useCallback(async () => {
    if (!hasPermission) {
      await primeMic();
    }
    await start();
  }, [hasPermission, primeMic, start]);

  return {
    // New API
    start,
    stop,
    restart,
    listening,
    supported,
    hasPermission,
    interim,
    final,
    error,
    dbfs,
    rms,
    micDenied,
    onInterim: onInterimCallback,
    onFinal: onFinalCallback,
    
    // Legacy API
    isListening: listening,
    isSupported: supported,
    transcript,
    confidence,
    loudness,
    startListening: start,
    stopListening: stop,
    toggle,
    resetTranscript,
    primeMic,
    autoStartListening
  };
};