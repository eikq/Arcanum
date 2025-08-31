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
  const backoffRef = useRef<number>(500);
  const micStateUnsubscribeRef = useRef<(() => void) | null>(null);

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
        setListening(true);
        setError(undefined);
        backoffRef.current = 500; // Reset backoff on successful start
      };

      recognition.onend = () => {
        setListening(false);
        
        // Auto-restart with capped backoff if we were supposed to be listening
        if (hasPermission && !micDenied && micStateRef.current?.ready === "ready") {
          const restartSR = () => {
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = setTimeout(() => {
              try {
                if (recognitionRef.current && micStateRef.current?.ready === "ready") {
                  recognition.start();
                }
              } catch (error) {
                console.warn('Failed to restart SR:', error);
                backoffRef.current = Math.min(5000, backoffRef.current * 1.5);
                restartSR();
              }
            }, backoffRef.current);
          };
          restartSR();
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          setHasPermission(false);
          setListening(false);
          setMicDenied(true);
          setError('Microphone permission denied');
        } else if (event.error === 'no-speech') {
          // This is normal, just restart
          if (hasPermission && micStateRef.current?.ready === "ready") {
            setTimeout(() => {
              try {
                if (recognitionRef.current) {
                  recognition.start();
                }
              } catch (e) {
                console.warn('Failed to restart after no-speech:', e);
              }
            }, 1000);
          }
        } else {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onresult = (event) => {
        const results = event.results;
        let interimTranscript = '';
        
        // Process all results
        for (let i = event.resultIndex; i < results.length; i++) {
          const result = results[i];
          const transcript = result[0].transcript.trim();
          
          if (result.isFinal) {
            const confidence = result[0].confidence || 0.9;
            
            // Update final transcript
            setFinal(transcript);
            setTranscript(transcript);
            setConfidence(confidence);
            if (onFinalCallback) {
              onFinalCallback(transcript, micStateRef.current?.rms || 0, micStateRef.current?.dbfs || -60);
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
            onInterimCallback(interimTranscript, micStateRef.current?.rms || 0, micStateRef.current?.dbfs || -60);
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
  }, [hasPermission, micDenied, onInterimCallback, onFinalCallback, onResult, loudness]);

  // Subscribe to mic state changes
  useEffect(() => {
    const unsubscribe = subscribeMicState((micState: MicState) => {
      micStateRef.current = micState;
      setDbfs(micState.dbfs);
      setLoudness(micState.rms);
      
      // Auto-start SR when mic becomes ready
      if (micState.ready === "ready" && !listening && hasPermission && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.warn('Failed to auto-start SR:', error);
        }
      }
    });

    micStateUnsubscribeRef.current = unsubscribe;
    
    return () => {
      unsubscribe();
    };
  }, [listening, hasPermission]);

  // Prime microphone
  const primeMic = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    try {
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
    
    if (!hasPermission) {
      await primeMic();
    }
    
    try {
      recognitionRef.current.start();
      setListening(true);
      setError(undefined);
    } catch (error) {
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Failed to start speech recognition:', error);
        setError(error.message);
      }
    }
  }, [hasPermission, primeMic]);

  // Stop listening
  const stop = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setListening(false);
  }, []);

  // Restart with exponential backoff
  const restart = useCallback(async () => {
    stop();
    await new Promise(resolve => setTimeout(resolve, backoffRef.current));
    await start();
  }, [start, stop]);

  // RMS getter
  const rms = useCallback(() => {
    return micStateRef.current?.rms ?? 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (micStateUnsubscribeRef.current) {
        micStateUnsubscribeRef.current();
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

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setFinal('');
    setInterim('');
    setConfidence(0);
  }, []);

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