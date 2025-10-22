/**
 * Microphone capture with Web Audio API
 * Converts stereo 48kHz → mono 16kHz PCM
 * Implements VAD (Voice Activity Detection) via RMS energy
 */

export interface MicConfig {
  sampleRate: number;
  targetSampleRate: number;
  channelCount: number;
  vadThreshold: number;
  silenceTimeout: number;
}

const DEFAULT_CONFIG: MicConfig = {
  sampleRate: 48000,
  targetSampleRate: 16000,
  channelCount: 1,
  vadThreshold: 0.015,
  silenceTimeout: 2000,
};

export class MicRecorder {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private config: MicConfig;
  private buffer: Float32Array[] = [];
  private silenceTimer: NodeJS.Timeout | null = null;
  private isActive = false;
  private lastRMS = 0;

  constructor(config?: Partial<MicConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<void> {
    console.log('[MIC] Connecting microphone...');
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Use ScriptProcessorNode for compatibility (4096 buffer)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      console.log('[MIC] Connected successfully');
    } catch (error) {
      console.error('[MIC] Connection failed:', error);
      throw new Error('Microphone access denied or unavailable');
    }
  }

  start(onAudio: (pcm: ArrayBuffer, energy: number) => void, onSilence?: () => void): void {
    if (!this.processor || !this.audioContext) {
      throw new Error('[MIC] Not connected. Call connect() first.');
    }

    console.log('[MIC] Starting recording...');
    this.isActive = true;
    this.buffer = [];

    this.processor.onaudioprocess = (event) => {
      if (!this.isActive) return;

      const inputData = event.inputBuffer.getChannelData(0);
      
      // Calculate RMS energy for VAD
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.lastRMS = rms;

      // VAD gate
      if (rms < this.config.vadThreshold) {
        // Silence detected
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            console.log('[MIC] Silence timeout, stopping...');
            if (onSilence) onSilence();
          }, this.config.silenceTimeout);
        }
        return;
      }

      // Voice detected - clear silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      // Resample and convert to mono 16kHz PCM
      const resampled = this.resample(inputData, this.config.sampleRate, this.config.targetSampleRate);
      const pcm16 = this.floatToPCM16(resampled);
      
      onAudio(pcm16.buffer as ArrayBuffer, rms);
    };
  }

  stop(): void {
    console.log('[MIC] Stopping recording...');
    this.isActive = false;
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    this.buffer = [];
  }

  disconnect(): void {
    console.log('[MIC] Disconnecting...');
    this.stop();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getVULevel(): number {
    return this.lastRMS;
  }

  isRecording(): boolean {
    return this.isActive;
  }

  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return input;

    const ratio = fromRate / toRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
      const t = srcIndex - srcIndexFloor;
      
      // Linear interpolation
      output[i] = input[srcIndexFloor] * (1 - t) + input[srcIndexCeil] * t;
    }

    return output;
  }

  private floatToPCM16(float32: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return pcm16;
  }
}
