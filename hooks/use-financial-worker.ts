import { useState, useEffect, useRef, useCallback } from 'react';

export type CalculationType = 'roi' | 'portfolio-stats' | 'rebalancing';

export interface CalculationRequest {
  id: string;
  type: CalculationType;
  data: any;
}

export interface CalculationResponse {
  id: string;
  type: CalculationType;
  result: any;
  error?: string;
}

export function useFinancialWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingPromises = useRef<Map<string, { resolve: (value: any) => void, reject: (reason: any) => void }>>(new Map());

  useEffect(() => {
    // Initialize worker
    const worker = new Worker('/financial-worker.js');
    workerRef.current = worker;
    setIsReady(true);

    // Handle messages from worker
    worker.onmessage = (event: MessageEvent<CalculationResponse>) => {
      const { id, result, error } = event.data;
      const promise = pendingPromises.current.get(id);

      if (promise) {
        if (error) {
          promise.reject(new Error(error));
        } else {
          promise.resolve(result);
        }
        pendingPromises.current.delete(id);
      }
    };

    worker.onerror = (error) => {
      console.error('Financial worker error:', error);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, []);

  const calculate = useCallback(async (type: CalculationType, data: any) => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    const id = crypto.randomUUID();
    const request: CalculationRequest = { id, type, data };

    return new Promise((resolve, reject) => {
      pendingPromises.current.set(id, { resolve, reject });
      workerRef.current?.postMessage(request);
    });
  }, []);

  return {
    calculate,
    isReady
  };
}
