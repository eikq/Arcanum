// Microphone bootstrap with Android compatibility and watchdog
export type MicState = {
  stream?: MediaStream;
  track?: MediaStreamTrack;
  deviceId?: string;
  context: AudioContext;
  analyser: AnalyserNode;
  compressor: DynamicsCompressorNode;
  source?: MediaStreamAudioSourceNode;
  rms: number;
  dbfs: number;
  muted: boolean;      // track.muted
  enabled: boolean;    // track.enabled
  ready: "idle"|"acquiring"|"ready"|"error";
  profile?: "A"|"B"|"C"|"D";
  error?: string;
};

type MicStateCallback = (state: MicState) => void;

class MicBootstrapManager {
  private state: MicState;
  private subscribers = new Set<MicStateCallback>();
  private watchdogInterval?: NodeJS.Timeout;
  private deviceChangeUnsubscribe?: () => void;
  private gestureListenersAdded = false;
  private lastRmsCheck = 0;
  private rmsHistory: number[] = [];

  constructor() {
    // Initialize AudioContext once
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const context = new AudioContextClass();
    
    this.state = {
      context,
      analyser: context.createAnalyser(),
      compressor: context.createDynamicsCompressor(),
      rms: 0,
      dbfs: -60,
      muted: false,
      enabled: true,
      ready: "idle"
    };

    this.setupAudioGraph();
    this.setupGestureBootstrap();
    this.setupDeviceChangeListener();
  }

  private setupAudioGraph(): void {
    const { context, analyser, compressor } = this.state;
    
    // Configure compressor for better dynamic range
    compressor.threshold.setValueAtTime(-24, context.currentTime);
    compressor.knee.setValueAtTime(30, context.currentTime);
    compressor.ratio.setValueAtTime(3, context.currentTime);
    compressor.attack.setValueAtTime(0.003, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);

    // Configure analyser
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
  }

  private setupGestureBootstrap(): void {
    if (this.gestureListenersAdded) return;

    const resumeAudio = async () => {
      if (this.state.context.state === 'suspended') {
        try {
          await this.state.context.resume();
          console.log('AudioContext resumed via user gesture');
        } catch (error) {
          console.warn('Failed to resume AudioContext:', error);
        }
      }
    };

    const handleGesture = () => {
      resumeAudio();
      // Keep listeners active for subsequent gestures
    };

    document.addEventListener('pointerdown', handleGesture);
    document.addEventListener('keydown', handleGesture);
    document.addEventListener('touchstart', handleGesture);
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) resumeAudio();
    });

    this.gestureListenersAdded = true;
  }

  private setupDeviceChangeListener(): void {
    if (!navigator.mediaDevices?.addEventListener) return;

    const handleDeviceChange = async () => {
      if (this.state.ready === "ready" && this.state.deviceId) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const currentDevice = devices.find(d => d.deviceId === this.state.deviceId);
          
          if (!currentDevice) {
            console.log('Current mic device disappeared, reacquiring...');
            await this.reacquireMic("device disappeared");
          }
        } catch (error) {
          console.warn('Device change check failed:', error);
        }
      }
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    this.deviceChangeUnsubscribe = () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }

  async acquireMic(preferredDeviceId?: string): Promise<MicState> {
    this.updateState({ ready: "acquiring", error: undefined });

    const profiles: Array<{ id: "A"|"B"|"C"|"D", constraints: MediaStreamConstraints }> = [
      {
        id: "A",
        constraints: {
          audio: {
            deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
            channelCount: 1,
            sampleRate: 48000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false
          }
        }
      },
      {
        id: "B", 
        constraints: {
          audio: {
            deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
            channelCount: 1,
            sampleRate: 48000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        }
      },
      {
        id: "C",
        constraints: {
          audio: {
            deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
            channelCount: 1,
            sampleRate: 44100,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        }
      },
      {
        id: "D",
        constraints: { audio: true }
      }
    ];

    for (const profile of profiles) {
      try {
        console.log(`Trying mic profile ${profile.id}...`);
        
        const stream = await navigator.mediaDevices.getUserMedia(profile.constraints);
        const track = stream.getAudioTracks()[0];
        
        if (!track) {
          stream.getTracks().forEach(t => t.stop());
          continue;
        }

        // Connect to audio graph
        if (this.state.source) {
          this.state.source.disconnect();
        }

        const source = this.state.context.createMediaStreamSource(stream);
        source.connect(this.state.compressor);
        this.state.compressor.connect(this.state.analyser);

        this.updateState({
          stream,
          track,
          deviceId: track.getSettings().deviceId,
          source,
          profile: profile.id,
          ready: "ready",
          error: undefined
        });

        // Test RMS for 500ms
        const rmsTestPassed = await this.testRmsLevel(500);
        
        if (rmsTestPassed && !track.muted) {
          console.log(`Mic profile ${profile.id} successful`);
          this.startWatchdog();
          this.startMeter();
          return this.state;
        } else {
          console.log(`Mic profile ${profile.id} failed RMS test or muted`);
          stream.getTracks().forEach(t => t.stop());
          this.updateState({ stream: undefined, track: undefined, source: undefined });
        }
      } catch (error) {
        console.warn(`Mic profile ${profile.id} failed:`, error);
        continue;
      }
    }

    this.updateState({ 
      ready: "error", 
      error: "All mic profiles failed" 
    });
    
    throw new Error("Failed to acquire microphone with any profile");
  }

  async reacquireMic(reason?: string): Promise<MicState> {
    console.log(`Reacquiring mic: ${reason || 'manual'}`);
    
    // Stop current stream
    if (this.state.stream) {
      this.state.stream.getTracks().forEach(track => track.stop());
    }
    
    this.stopWatchdog();
    this.updateState({ 
      stream: undefined, 
      track: undefined, 
      source: undefined,
      ready: "idle" 
    });

    return this.acquireMic(this.state.deviceId);
  }

  private async testRmsLevel(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const dataArray = new Float32Array(this.state.analyser.fftSize);
      
      const checkRms = () => {
        this.state.analyser.getFloatTimeDomainData(dataArray);
        const rms = this.computeRms(dataArray);
        
        if (rms > 0.005) {
          resolve(true);
          return;
        }
        
        if (performance.now() - startTime > timeoutMs) {
          resolve(false);
          return;
        }
        
        setTimeout(checkRms, 50);
      };
      
      checkRms();
    });
  }

  private startWatchdog(): void {
    this.stopWatchdog();
    
    this.watchdogInterval = setInterval(() => {
      if (this.state.ready !== "ready" || !this.state.track) return;

      const track = this.state.track;
      const now = performance.now();
      
      // Check if track is muted
      if (track.muted && now - this.lastRmsCheck > 1000) {
        console.log('Watchdog: Track muted, reacquiring...');
        this.reacquireMic("track muted");
        return;
      }

      // Check if RMS has been silent too long
      if (this.rmsHistory.length >= 30) { // 30 * 50ms = 1.5s
        const avgRms = this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length;
        if (avgRms < 0.003) {
          console.log('Watchdog: Silent for too long, reacquiring...');
          this.reacquireMic("silent buffer");
          return;
        }
      }
    }, 1000);
  }

  private stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = undefined;
    }
  }

  private startMeter(): void {
    const dataArray = new Float32Array(this.state.analyser.fftSize);
    
    const updateMeter = () => {
      if (this.state.ready !== "ready") return;
      
      this.state.analyser.getFloatTimeDomainData(dataArray);
      const rms = this.computeRms(dataArray);
      const dbfs = this.rmsToDbfs(rms);
      
      // Update RMS history for watchdog
      this.rmsHistory.push(rms);
      if (this.rmsHistory.length > 30) {
        this.rmsHistory.shift();
      }
      
      // Update track state
      const track = this.state.track;
      const muted = track?.muted ?? false;
      const enabled = track?.enabled ?? true;
      
      this.updateState({ rms, dbfs, muted, enabled });
      
      requestAnimationFrame(updateMeter);
    };
    
    updateMeter();
  }

  private computeRms(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const sample = buffer[i];
      sum += sample * sample;
    }
    return Math.sqrt(sum / buffer.length);
  }

  private rmsToDbfs(rms: number): number {
    return 20 * Math.log10(Math.max(rms, 1e-8));
  }

  private updateState(updates: Partial<MicState>): void {
    this.state = { ...this.state, ...updates };
    this.subscribers.forEach(callback => callback(this.state));
  }

  subscribe(callback: MicStateCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getState(): MicState {
    return { ...this.state };
  }

  destroy(): void {
    this.stopWatchdog();
    
    if (this.state.stream) {
      this.state.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.state.source) {
      this.state.source.disconnect();
    }
    
    if (this.deviceChangeUnsubscribe) {
      this.deviceChangeUnsubscribe();
    }
    
    this.subscribers.clear();
  }
}

// Singleton instance
export const micBootstrap = new MicBootstrapManager();

// Public API
export async function acquireMic(preferredDeviceId?: string): Promise<MicState> {
  return micBootstrap.acquireMic(preferredDeviceId);
}

export async function reacquireMic(reason?: string): Promise<MicState> {
  return micBootstrap.reacquireMic(reason);
}

export function onUserGestureBootstrap(): void {
  // This is handled automatically in the constructor
}

export function subscribeDeviceChange(cb: () => void): () => void {
  // Device changes are handled internally, but we can notify external listeners
  return micBootstrap.subscribe(() => cb());
}

export function subscribeMicState(callback: MicStateCallback): () => void {
  return micBootstrap.subscribe(callback);
}

export function getMicState(): MicState {
  return micBootstrap.getState();
}

export function destroyMic(): void {
  micBootstrap.destroy();
}