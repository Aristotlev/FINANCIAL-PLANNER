/**
 * Debounce utility to prevent excessive function calls
 */

const debounceTimers = new Map<string, NodeJS.Timeout>();

/**
 * Debounce a function call
 * @param key Unique key for this debounce instance
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  key: string,
  fn: T,
  delay: number = 300
): void {
  // Clear existing timer
  const existingTimer = debounceTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => {
    fn();
    debounceTimers.delete(key);
  }, delay);

  debounceTimers.set(key, timer);
}

/**
 * Dispatch a debounced custom event
 * @param eventName Name of the event to dispatch
 * @param delay Delay in milliseconds
 */
export function debouncedDispatch(eventName: string, delay: number = 300): void {
  debounce(`event_${eventName}`, () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(eventName));
    }
  }, delay);
}

/**
 * Clear all debounce timers
 */
export function clearAllDebounces(): void {
  debounceTimers.forEach(timer => clearTimeout(timer));
  debounceTimers.clear();
}
