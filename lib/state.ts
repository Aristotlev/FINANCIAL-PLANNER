/**
 * Finite State Machine for voice agent
 * States: IDLE → LISTENING → THINKING → SPEAKING → IDLE
 * Auto-cancels playback when user interrupts
 */

export type VoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING';

export interface StateTransition {
  from: VoiceState;
  to: VoiceState;
  timestamp: number;
}

type StateListener = (state: VoiceState, previous: VoiceState) => void;

export class VoiceStateMachine {
  private state: VoiceState = 'IDLE';
  private listeners: StateListener[] = [];
  private history: StateTransition[] = [];

  constructor() {
    console.log('[STATE] Initialized in IDLE state');
  }

  getState(): VoiceState {
    return this.state;
  }

  transition(to: VoiceState): void {
    const from = this.state;
    
    if (!this.isValidTransition(from, to)) {
      console.warn(`[STATE] Invalid transition: ${from} → ${to}`);
      return;
    }

    console.log(`[STATE] Transition: ${from} → ${to}`);
    
    this.history.push({
      from,
      to,
      timestamp: Date.now(),
    });

    this.state = to;
    this.notifyListeners(to, from);
  }

  onStateChange(listener: StateListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(state: VoiceState, previous: VoiceState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state, previous);
      } catch (error) {
        console.error('[STATE] Listener error:', error);
      }
    });
  }

  private isValidTransition(from: VoiceState, to: VoiceState): boolean {
    const validTransitions: Record<VoiceState, VoiceState[]> = {
      IDLE: ['LISTENING'],
      LISTENING: ['THINKING', 'IDLE'],
      THINKING: ['SPEAKING', 'IDLE', 'LISTENING'],
      SPEAKING: ['IDLE', 'LISTENING'],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  reset(): void {
    console.log('[STATE] Resetting to IDLE');
    const previous = this.state;
    this.state = 'IDLE';
    this.history = [];
    this.notifyListeners('IDLE', previous);
  }

  shouldMuteMic(): boolean {
    return this.state === 'SPEAKING' || this.state === 'THINKING';
  }

  canInterrupt(): boolean {
    return this.state === 'SPEAKING';
  }

  getHistory(): StateTransition[] {
    return [...this.history];
  }
}

// Singleton instance
let stateMachine: VoiceStateMachine | null = null;

export function getStateMachine(): VoiceStateMachine {
  if (!stateMachine) {
    stateMachine = new VoiceStateMachine();
  }
  return stateMachine;
}
