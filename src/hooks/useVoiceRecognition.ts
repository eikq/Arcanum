import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceRecognitionState } from '@/types/game';
import { AudioMeter, AudioMeterState } from '@/audio/AudioMeter';

// NEW: Enhanced SR result types
export type SRResult = { transcript: string; isFinal: boolean; alt?: string[]; };

export interface VoiceRecognitionHook extends VoiceRecognitionState {
  startListening: () => Promise<void>;
  stopListening: () => void;
  restart: () => Promise<void>;
  toggle: () => void;
  resetTranscript: () => void;
  primeMic: (deviceId?: string) => Promise<MediaStream>;
  
  // NEW: Enhanced state
  interim: string;
  final: string;
  supported: boolean;
  error?: string;
  dbfs: number;
  
  // NEW: Callbacks
  onInterim?: (transcript: string) => void;
  onFinal?: (transcript: string) => void;
  
  // Deprecated but kept for compatibility
  autoStartListening?: () => Promise<void>;
  rms: () => number;
  micDenied: boolean;
}

export const useVoiceRecognition = (
  onResult?: (transcript: string, confidence: number, loudness: number) => void,
  hotwordEnabled = false,
  hotword = 'arcanum',
  onInterim?: (transcript: string) => void,
  onFinal?: (transcript: string) => void
): VoiceRecognitionHook => {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    isSupported: false,
    hasPermission: false,
    transcript: '',
    confidence: 0,
    loudness: 0
  });

  // NEW: Enhanced state
  const [interim, setInterim] = useState('');
  const [final, setFinal] = useState('');
  const [micDenied, setMicDenied] = useState(false);
  const [error, setError] = useState<string>();
  const [dbfs, setDbfs] = useState(-60);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioMeterRef = useRef<AudioMeter | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const lastResultTimeRef = useRef<number>(0);
  const backoffRef = useRef<number>(500);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setState(prev => ({ ...prev, isSupported: true }));
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 3;

      recognitionRef.current = recognition;

      // Speech recognition event handlers
      recognition.onstart = () => {
        setState(prev => ({ ...prev, isListening: true }));
      };

      recognition.onend = () => {
        setState(prev => ({ ...prev, isListening: false }));
        
        // FIX: Auto-restart with capped backoff
        if (state.isListening) {
          let backoff = 500;
          const maxBackoff = 5000;
          const restartSR = () => {
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = setTimeout(() => {
              try {
                if (recognitionRef.current && state.isListening) {
                  recognitionRef.current.start();
                }
              } catch (error) {
                console.warn('Failed to restart SR:', error);
                backoff = Math.min(maxBackoff, backoff + 250);
                restartSR();
              }
            }, backoff);
          };
          restartSR();
        }
      };

        recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        
        if (event.error === 'not-allowed') {
          setState(prev => ({ ...prev, hasPermission: false, isListening: false }));
          setMicDenied(true); // FIX: Track mic denial
        } else {
          // Retry on other errors with capped backoff
          let retryCount = 0;
          const maxRetries = 3;
          const retryWithBackoff = () => {
            if (retryCount >= maxRetries || !state.isListening) return;
            
            const delay = Math.min(5000, 1000 * Math.pow(2, retryCount));
            setTimeout(() => {
              if (state.isListening && recognitionRef.current) {
                try {
                  recognition.start();
                } catch (error) {
                  console.warn(`Retry ${retryCount + 1} failed:`, error);
                  retryCount++;
                  retryWithBackoff();
                }
              }
            }, delay);
          };
          
          retryCount++;
          retryWithBackoff();
        }
      };

      recognition.onresult = (event) => {
        const results = event.results;
        let interimTranscript = '';
        
        // Process all results
        for (let i = event.resultIndex; i < results.length; i++) {
          const result = results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            const cleanTranscript = transcript.trim();
            const confidence = result[0].confidence || 0.9;
            const now = Date.now();

            // Update final transcript
            setFinal(cleanTranscript);
            onFinal?.(cleanTranscript);

            // Legacy handling - check for hotword if enabled
            if (hotwordEnabled) {
              const lowerTranscript = cleanTranscript.toLowerCase();
              const lowerHotword = hotword.toLowerCase();
              
              if (lowerTranscript.includes(lowerHotword)) {
                const spellPart = lowerTranscript.replace(lowerHotword, '').trim();
                if (spellPart) {
                  setState(prev => ({ ...prev, transcript: spellPart, confidence }));
                  onResult?.(spellPart, confidence, state.loudness);
                }
              }
            } else {
              setState(prev => ({ ...prev, transcript: cleanTranscript, confidence }));
              onResult?.(cleanTranscript, confidence, state.loudness);
            }

            // Clear interim after final
            setInterim('');
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update interim transcript
        if (interimTranscript) {
          setInterim(interimTranscript.trim());
          onInterim?.(interimTranscript.trim());
        }
      };
    }

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [hotwordEnabled, hotword, onResult, state.isListening, state.loudness]);

  // NEW: Prime microphone with AudioMeter integration
  const primeMic = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 44100
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      // Initialize AudioMeter
      if (!audioMeterRef.current) {
        audioMeterRef.current = new AudioMeter();
      }
      
      await audioMeterRef.current.initialize(stream);
      
      // Subscribe to audio meter updates
      audioMeterRef.current.subscribe((meterState: AudioMeterState) => {
        setState(prev => ({ ...prev, loudness: meterState.rms }));
        setDbfs(meterState.dbfs);
      });
      
      audioMeterRef.current.start();
      
      setState(prev => ({ ...prev, hasPermission: true }));
      setMicDenied(false);
      setError(undefined);
      
      return stream;
    } catch (error) {
      console.error('Failed to prime microphone:', error);
      setState(prev => ({ ...prev, hasPermission: false }));
      setMicDenied(true);
      setError(error instanceof Error ? error.message : 'Microphone error');
      throw error;
    }
  }, []);

  // NEW: Restart with exponential backoff
  const restart = useCallback(async () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    const maxBackoff = 5000;
    restartTimeoutRef.current = setTimeout(async () => {
      try {
        if (recognitionRef.current && !state.isListening) {
          await startListening();
          backoffRef.current = 500; // Reset backoff on success
        }
      } catch (error) {
        console.warn('Failed to restart SR:', error);
        backoffRef.current = Math.min(maxBackoff, backoffRef.current * 1.5);
        restart(); // Retry with increased backoff
      }
    }, backoffRef.current);
  }, [state.isListening]);

  // Legacy support
  const autoStartListening = useCallback(async () => {
    if (!state.hasPermission) {
      await primeMic();
    }
    await startListening();
  }, [state.hasPermission, primeMic]);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }
    
    if (!state.hasPermission) {
      await primeMic();
    }
    
    try {
      recognitionRef.current.start();
      setState(prev => ({ ...prev, isListening: true }));
      setError(undefined);
    } catch (error) {
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Failed to start speech recognition:', error);
        setError(error.message);
      }
    }
  }, [state.hasPermission, primeMic]);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (audioMeterRef.current) {
      audioMeterRef.current.stop();
    }
    
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', confidence: 0 }));
    setInterim('');
    setFinal('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (audioMeterRef.current) {
        audioMeterRef.current.cleanup();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Legacy RMS getter
  const rms = useCallback(() => {
    return state.loudness;
  }, [state.loudness]);

  return {
    ...state,
    startListening,
    stopListening,
    restart,
    toggle,
    resetTranscript,
    primeMic,
    
    // NEW: Enhanced state
    interim,
    final,
    supported: state.isSupported,
    error,
    dbfs,
    
    // NEW: Callbacks (for external setting)
    onInterim,
    onFinal,
    
    // Legacy compatibility
    autoStartListening,
    rms,
    micDenied
  };
};