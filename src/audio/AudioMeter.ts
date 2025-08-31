// Real-time audio metering with RMS and dBFS calculation
import { subscribeMicState, type MicState } from './MicBootstrap';

export interface AudioMeterState {
  rms: number;
  dbfs: number;
  isActive: boolean;
}

export type AudioMeterCallback = (state: AudioMeterState) => void;

export class AudioMeter {
  private subscribers = new Set<AudioMeterCallback>();
  private isRunning = false;
  private micStateUnsubscribe?: () => void;
  private animationFrame?: number;
  
  // EMA smoothing factor (α ≈ 0.35 for smooth but responsive)
  private smoothingFactor = 0.35;
  private smoothedRms = 0;
  private smoothedDbfs = -60;

  async initialize(stream: MediaStream): Promise<void> {
    // MicBootstrap handles the actual audio setup
    // This method exists for compatibility
    console.log('AudioMeter: Using MicBootstrap for audio setup');
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Subscribe to mic state updates
    this.micStateUnsubscribe = subscribeMicState((micState: MicState) => {
      if (micState.ready === "ready") {
        this.updateFromMicState(micState);
      }
    });
    
    this.startMeterLoop();
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    
    if (this.micStateUnsubscribe) {
      this.micStateUnsubscribe();
      this.micStateUnsubscribe = undefined;
    }
  }

  private startMeterLoop(): void {
    const updateMeter = () => {
      if (!this.isRunning) return;
      
      // Notify subscribers with current smoothed values
      const state: AudioMeterState = {
        rms: this.smoothedRms,
        dbfs: this.smoothedDbfs,
        isActive: this.isRunning
      };

      this.subscribers.forEach(callback => callback(state));
      
      this.animationFrame = requestAnimationFrame(updateMeter);
    };
    
    updateMeter();
  }

  private updateFromMicState(micState: MicState): void {
    // Apply EMA smoothing
    this.smoothedRms = this.smoothingFactor * micState.rms + (1 - this.smoothingFactor) * this.smoothedRms;
    this.smoothedDbfs = this.smoothingFactor * micState.dbfs + (1 - this.smoothingFactor) * this.smoothedDbfs;
  }

  subscribe(callback: AudioMeterCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getRms(): number {
    return this.smoothedRms;
  }

  getDbfs(): number {
    return this.smoothedDbfs;
  }

  destroy(): void {
    this.stop();
    this.subscribers.clear();
  }

  // Static utility functions
  static computeRms(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const sample = buffer[i];
      sum += sample * sample;
    }
    return Math.sqrt(sum / buffer.length);
  }

  static rmsToDbfs(rms: number): number {
    return 20 * Math.log10(Math.max(rms, 1e-8));
  }
}