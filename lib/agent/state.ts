/**
 * Finite State Machine for Jarvis Voice Assistant
 * Manages state transitions and ensures valid state flow
 * States: IDLE → WAKE → LISTENING → THINKING → SPEAKING → (loop or IDLE)
 */

export enum AgentState {
  /** Waiting for activation (wake word or button press) */
  IDLE = 'IDLE',
  
  /** Wake word detected, preparing to listen */
  WAKE = 'WAKE',
  
  /** Actively listening for user input */
  LISTENING = 'LISTENING',
  
  /** Processing user input (STT + LLM) */
  THINKING = 'THINKING',
  
  /** Playing TTS response */
  SPEAKING = 'SPEAKING',
  
  /** Error state */
  ERROR = 'ERROR',
}

export interface StateTransition {
  from: AgentState;
  to: AgentState;
  timestamp: number;
  reason?: string;
}

export class AgentStateMachine {
  private currentState: AgentState = AgentState.IDLE;
  private history: StateTransition[] = [];
  private maxHistorySize = 50;
  
  /** Valid state transitions */
  private validTransitions: Map<AgentState, AgentState[]> = new Map([
    [AgentState.IDLE, [AgentState.WAKE, AgentState.LISTENING]],
    [AgentState.WAKE, [AgentState.LISTENING, AgentState.IDLE, AgentState.ERROR]],
    [AgentState.LISTENING, [AgentState.THINKING, AgentState.IDLE, AgentState.ERROR]],
    [AgentState.THINKING, [AgentState.SPEAKING, AgentState.LISTENING, AgentState.IDLE, AgentState.ERROR]],
    [AgentState.SPEAKING, [AgentState.LISTENING, AgentState.IDLE, AgentState.ERROR]],
    [AgentState.ERROR, [AgentState.IDLE]],
  ]);

  constructor(initialState: AgentState = AgentState.IDLE) {
    this.currentState = initialState;
    console.log(`[FSM] Initialized with state: ${initialState}`);
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return this.currentState;
  }

  /**
   * Transition to a new state
   * @param newState Target state
   * @param reason Optional reason for transition
   * @returns True if transition was successful
   */
  transition(newState: AgentState, reason?: string): boolean {
    // Check if transition is valid
    if (!this.canTransition(newState)) {
      console.warn(
        `[FSM] Invalid transition: ${this.currentState} → ${newState}`,
        reason
      );
      return false;
    }

    // Record transition
    const transition: StateTransition = {
      from: this.currentState,
      to: newState,
      timestamp: Date.now(),
      reason,
    };

    this.history.push(transition);
    
    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    console.log(
      `[FSM] ${this.currentState} → ${newState}`,
      reason ? `(${reason})` : ''
    );

    this.currentState = newState;
    return true;
  }

  /**
   * Check if transition to a state is valid
   */
  canTransition(newState: AgentState): boolean {
    const allowedStates = this.validTransitions.get(this.currentState) || [];
    return allowedStates.includes(newState);
  }

  /**
   * Get list of valid next states from current state
   */
  getValidNextStates(): AgentState[] {
    return this.validTransitions.get(this.currentState) || [];
  }

  /**
   * Reset to IDLE state
   */
  reset(reason?: string): void {
    console.log('[FSM] Resetting to IDLE', reason ? `(${reason})` : '');
    this.currentState = AgentState.IDLE;
    
    this.history.push({
      from: this.currentState,
      to: AgentState.IDLE,
      timestamp: Date.now(),
      reason: reason || 'reset',
    });
  }

  /**
   * Force a state (bypasses validation - use carefully!)
   */
  forceState(state: AgentState, reason: string): void {
    console.warn(`[FSM] Force setting state to ${state} (${reason})`);
    
    this.history.push({
      from: this.currentState,
      to: state,
      timestamp: Date.now(),
      reason: `FORCED: ${reason}`,
    });
    
    this.currentState = state;
  }

  /**
   * Get transition history
   */
  getHistory(): StateTransition[] {
    return [...this.history];
  }

  /**
   * Get last N transitions
   */
  getRecentHistory(count: number = 5): StateTransition[] {
    return this.history.slice(-count);
  }

  /**
   * Check if in a specific state
   */
  isInState(state: AgentState): boolean {
    return this.currentState === state;
  }

  /**
   * Check if in one of multiple states
   */
  isInStates(states: AgentState[]): boolean {
    return states.includes(this.currentState);
  }

  /**
   * Get time spent in current state (ms)
   */
  getTimeInCurrentState(): number {
    if (this.history.length === 0) return 0;
    const lastTransition = this.history[this.history.length - 1];
    return Date.now() - lastTransition.timestamp;
  }

  /**
   * Check if currently processing (not idle)
   */
  isActive(): boolean {
    return this.currentState !== AgentState.IDLE;
  }

  /**
   * Check if can be interrupted (e.g., for barge-in)
   */
  canBargeIn(): boolean {
    // Can interrupt during SPEAKING or LISTENING
    return this.currentState === AgentState.SPEAKING || 
           this.currentState === AgentState.LISTENING;
  }
}

/**
 * Helper to create and manage a global state machine instance
 */
let globalStateMachine: AgentStateMachine | null = null;

export function getStateMachine(): AgentStateMachine {
  if (!globalStateMachine) {
    globalStateMachine = new AgentStateMachine();
  }
  return globalStateMachine;
}

export function resetStateMachine(): void {
  globalStateMachine = new AgentStateMachine();
}
