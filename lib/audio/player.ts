/**
 * Audio playback manager with queue and crossfade support
 * Uses a single global AudioContext to prevent glitches
 */

export class AudioPlayer {
  private static instance: AudioPlayer | null = null;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private startTime = 0;

  private constructor() {}

  static getInstance(): AudioPlayer {
    if (!AudioPlayer.instance) {
      AudioPlayer.instance = new AudioPlayer();
    }
    return AudioPlayer.instance;
  }

  async init(): Promise<void> {
    if (this.audioContext) return;

    console.log('[PLAYER] Initializing audio context...');
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    console.log('[PLAYER] Audio context ready');
  }

  async playFromStream(stream: ReadableStream<Uint8Array>): Promise<void> {
    await this.init();
    if (!this.audioContext) throw new Error('[PLAYER] AudioContext not initialized');

    console.log('[PLAYER] Playing from stream...');
    
    // Cancel any existing playback
    this.cancel();

    try {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Concatenate all chunks
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const audioData = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        audioData.set(chunk, offset);
        offset += chunk.length;
      }

      // Decode and play
      await this.playFromBuffer(audioData.buffer);
      
    } catch (error) {
      console.error('[PLAYER] Stream playback error:', error);
      await this.reset();
      throw error;
    }
  }

  async playFromBuffer(arrayBuffer: ArrayBuffer): Promise<void> {
    await this.init();
    if (!this.audioContext || !this.gainNode) {
      throw new Error('[PLAYER] AudioContext not initialized');
    }

    console.log('[PLAYER] Decoding audio buffer...');
    
    try {
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      
      // Cancel previous playback with small crossfade
      if (this.currentSource && this.isPlaying) {
        const fadeTime = 0.05; // 50ms crossfade
        this.gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          this.audioContext.currentTime + fadeTime
        );
        
        setTimeout(() => {
          if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource.disconnect();
          }
        }, fadeTime * 1000);
      }

      // Create new source
      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.gainNode);

      // Fade in
      this.gainNode.gain.setValueAtTime(0.01, this.audioContext.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(1.0, this.audioContext.currentTime + 0.05);

      this.currentSource.onended = () => {
        console.log('[PLAYER] Playback finished');
        this.isPlaying = false;
        this.currentSource = null;
      };

      this.isPlaying = true;
      this.startTime = this.audioContext.currentTime;
      this.currentSource.start(0);
      
      console.log('[PLAYER] Playback started');
      
    } catch (error) {
      console.error('[PLAYER] Decode error:', error);
      await this.reset();
      throw error;
    }
  }

  async playFromBlob(blob: Blob): Promise<void> {
    const arrayBuffer = await blob.arrayBuffer();
    await this.playFromBuffer(arrayBuffer);
  }

  cancel(): void {
    console.log('[PLAYER] Canceling playback...');
    
    if (this.currentSource && this.isPlaying) {
      try {
        if (this.gainNode && this.audioContext) {
          // Quick fade out
          this.gainNode.gain.setValueAtTime(
            this.gainNode.gain.value,
            this.audioContext.currentTime
          );
          this.gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            this.audioContext.currentTime + 0.02
          );
        }
        
        setTimeout(() => {
          if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource.disconnect();
            this.currentSource = null;
          }
        }, 25);
        
      } catch (error) {
        console.error('[PLAYER] Cancel error:', error);
      }
    }
    
    this.isPlaying = false;
    this.queue = [];
  }

  async reset(): Promise<void> {
    console.log('[PLAYER] Resetting audio context...');
    
    this.cancel();
    
    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.error('[PLAYER] Close error:', error);
      }
      this.audioContext = null;
      this.gainNode = null;
    }
    
    // Reinitialize
    await this.init();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return 0;
    return this.audioContext.currentTime - this.startTime;
  }
}
