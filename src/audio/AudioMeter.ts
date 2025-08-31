// Real-time audio metering with RMS and dBFS calculation
export interface AudioMeterState {
  rms: number;
  dbfs: number;
  isActive: boolean;
}

export type AudioMeterCallback = (state: AudioMeterState) => void;

export class AudioMeter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private dataArray: Float32Array | null = null;
  private animationFrame: number | null = null;
  private subscribers: Set<AudioMeterCallback> = new Set();
  private isRunning = false;

  // EMA smoothing factor (α ≈ 0.35 for smooth but responsive)
  private smoothingFactor = 0.35;
  private smoothedRms = 0;

  async initialize(stream: MediaStream): Promise<void> {
    try {
      // Create or resume AudioContext
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Build audio graph: Source → Compressor → Analyser
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      
      // Light compression for better dynamic range
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
      this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
      this.compressor.ratio.setValueAtTime(3, this.audioContext.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect: Source → Compressor → Analyser
      this.sourceNode.connect(this.compressor);
      this.compressor.connect(this.analyser);

      // Prepare data buffer
      this.dataArray = new Float32Array(this.analyser.fftSize);

      console.log('AudioMeter: Initialized successfully');
    } catch (error) {
      console.error('AudioMeter: Failed to initialize:', error);
      throw error;
    }
  }

  start(): void {
    if (this.isRunning || !this.analyser || !this.dataArray) return;
    
    this.isRunning = true;
    this.updateMeter();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private updateMeter = (): void => {
    if (!this.isRunning || !this.analyser || !this.dataArray) return;

    // Get time domain data for RMS calculation
    this.analyser.getFloatTimeDomainData(this.dataArray);

    // Compute RMS (Root Mean Square)
    const rms = this.computeRms(this.dataArray);
    
    // Apply EMA smoothing
    this.smoothedRms = this.smoothingFactor * rms + (1 - this.smoothingFactor) * this.smoothedRms;
    
    // Convert RMS to dBFS (decibels relative to full scale)
    const dbfs = this.rmsToDbfs(this.smoothedRms);

    // Notify subscribers
    const state: AudioMeterState = {
      rms: this.smoothedRms,
      dbfs,
      isActive: this.isRunning
    };

    this.subscribers.forEach(callback => callback(state));

    // Continue animation loop
    this.animationFrame = requestAnimationFrame(this.updateMeter);
  };

  private computeRms(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      const sample = buffer[i];
      sum += sample * sample;
    }
    return Math.sqrt(sum / buffer.length);
  }

  private rmsToDbfs(rms: number): number {
    // Convert RMS to dBFS, with floor at -60 dB
    return 20 * Math.log10(Math.max(rms, 1e-6));
  }

  subscribe(callback: AudioMeterCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getRms(): number {
    return this.smoothedRms;
  }

  getDbfs(): number {
    return this.rmsToDbfs(this.smoothedRms);
  }

  cleanup(): void {
    this.stop();
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.compressor) {
      this.compressor.disconnect();
      this.compressor = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    this.subscribers.clear();
    this.smoothedRms = 0;
  }

  // Utility functions for external use
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