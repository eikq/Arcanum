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

  async acquireMic(preferredDeviceId?: string): Promise<MicState> {
    this.updateState({ ready: "acquiring", error: undefined });

    // Resume AudioContext if suspended
    if (this.state.context.state === 'suspended') {
      try {
        await this.state.context.resume();
        console.log('AudioContext resumed before mic acquisition');
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
      }
    }

    try {
      const constraints = {
        audio: {
          deviceId: preferredDeviceId ? { exact: preferredDeviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getAudioTracks()[0];
      
      if (!track) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error('No audio track found');
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
        ready: "ready",
        error: undefined
      });

      console.log('Microphone acquired successfully');
      this.startMeter();
      return this.state;
    } catch (error) {
      console.error('Failed to acquire microphone:', error);
      this.updateState({ 
        ready: "error", 
        error: error instanceof Error ? error.message : "Microphone access failed"
      });
      throw error;
    }
  }

  async reacquireMic(reason?: string): Promise<MicState> {
    console.log(`Reacquiring mic: ${reason || 'manual'}`);
    
    // Stop current stream
    if (this.state.stream) {
      this.state.stream.getTracks().forEach(track => track.stop());
    }
    
    this.updateState({ 
      stream: undefined, 
      track: undefined, 
      source: undefined,
      ready: "idle" 
    });

    return this.acquireMic(this.state.deviceId);
  }

  private startMeter(): void {
    const dataArray = new Float32Array(this.state.analyser.fftSize);
    
    const updateMeter = () => {
      if (this.state.ready !== "ready") return;
      
      this.state.analyser.getFloatTimeDomainData(dataArray);
      const rms = this.computeRms(dataArray);
      const dbfs = this.rmsToDbfs(rms);
      
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
    if (this.state.stream) {
      this.state.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.state.source) {
      this.state.source.disconnect();
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