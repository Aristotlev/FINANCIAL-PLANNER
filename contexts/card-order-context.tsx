"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { CardType } from './hidden-cards-context';

interface CardOrderContextType {
  cardOrder: CardType[];
  moveCard: (draggedCardId: CardType, targetCardId: CardType) => void;
  resetOrder: () => void;
}

const CardOrderContext = createContext<CardOrderContextType | undefined>(undefined);

const STORAGE_KEY = 'moneyHub_cardOrder';

// Default card order matching the original dashboard layout
export const DEFAULT_CARD_ORDER: CardType[] = [
  // Top Row
  'cash',
  'savings',
  'crypto',
  'stocks',
  // Middle Row
  'networth',
  'tools',
  'news',
  // Bottom Row
  'realestate',
  'trading',
  'valuableitems',
  'expenses',
  'taxes',
];

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function CardOrderProvider({ children }: { children: ReactNode }) {
  const [cardOrder, setCardOrder] = useState<CardType[]>(DEFAULT_CARD_ORDER);
  const [isLoaded, setIsLoaded] = useState(false);
  const supabaseSyncRef = useRef<((order: CardType[]) => void) | null>(null);

  // Initialize Supabase sync function
  useEffect(() => {
    // Dynamically import to avoid SSR issues
    import('../lib/supabase/supabase-data-service').then(({ SupabaseDataService }) => {
      supabaseSyncRef.current = debounce(async (order: CardType[]) => {
        try {
          await SupabaseDataService.updateCardOrder(order);
        } catch (error) {
          console.error('Error syncing card order to Supabase:', error);
        }
      }, 1000); // Debounce by 1 second to avoid too many API calls
    }).catch(() => {
      // Supabase not available, localStorage only
    });
  }, []);

  // Load card order from localStorage and Supabase on mount
  useEffect(() => {
    const loadCardOrder = async () => {
      try {
        // First, load from localStorage for immediate display
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length === DEFAULT_CARD_ORDER.length) {
            const hasAllCards = DEFAULT_CARD_ORDER.every(card => parsed.includes(card));
            if (hasAllCards) {
              setCardOrder(parsed);
            }
          }
        }

        // Then try to load from Supabase (authoritative source)
        try {
          const { SupabaseDataService } = await import('../lib/supabase/supabase-data-service');
          const prefs = await SupabaseDataService.getUserPreferences();
          if (prefs?.cardOrder && Array.isArray(prefs.cardOrder) && prefs.cardOrder.length === DEFAULT_CARD_ORDER.length) {
            const hasAllCards = DEFAULT_CARD_ORDER.every(card => prefs.cardOrder!.includes(card as string));
            if (hasAllCards) {
              setCardOrder(prefs.cardOrder as CardType[]);
              // Update localStorage with Supabase data
              localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.cardOrder));
            }
          }
        } catch {
          // Supabase not available or user not logged in, localStorage only
        }
      } catch (error) {
        console.error('Error loading card order:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadCardOrder();
  }, []);

  // Save to localStorage whenever cardOrder changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cardOrder));
        // Sync to Supabase (debounced)
        if (supabaseSyncRef.current) {
          supabaseSyncRef.current(cardOrder);
        }
      } catch (error) {
        console.error('Error saving card order:', error);
      }
    }
  }, [cardOrder, isLoaded]);

  // Listen for reset events
  useEffect(() => {
    const handleReset = () => {
      setCardOrder(DEFAULT_CARD_ORDER);
    };

    window.addEventListener('resetCardPositions', handleReset);
    return () => window.removeEventListener('resetCardPositions', handleReset);
  }, []);

  const moveCard = useCallback((draggedCardId: CardType, targetCardId: CardType) => {
    if (draggedCardId === targetCardId) return;

    setCardOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const draggedIndex = newOrder.indexOf(draggedCardId);
      const targetIndex = newOrder.indexOf(targetCardId);

      if (draggedIndex === -1 || targetIndex === -1) return prevOrder;

      // Remove dragged card from its current position
      newOrder.splice(draggedIndex, 1);
      
      // Insert dragged card at target position
      newOrder.splice(targetIndex, 0, draggedCardId);

      return newOrder;
    });
  }, []);

  const resetOrder = useCallback(() => {
    setCardOrder(DEFAULT_CARD_ORDER);
  }, []);

  return (
    <CardOrderContext.Provider
      value={{
        cardOrder,
        moveCard,
        resetOrder,
      }}
    >
      {children}
    </CardOrderContext.Provider>
  );
}

export function useCardOrder() {
  const context = useContext(CardOrderContext);
  if (context === undefined) {
    throw new Error('useCardOrder must be used within a CardOrderProvider');
  }
  return context;
}
