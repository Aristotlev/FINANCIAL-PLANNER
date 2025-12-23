"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';

// All available card types
export type CardType = 
  | 'cash'
  | 'savings'
  | 'crypto'
  | 'stocks'
  | 'networth'
  | 'tools'
  | 'news'
  | 'realestate'
  | 'trading'
  | 'valuableitems'
  | 'expenses'
  | 'taxes';

export interface CardInfo {
  id: CardType;
  name: string;
  icon: string; // emoji or icon identifier
  color: string;
}

// Card metadata for display in the folder
export const CARD_METADATA: Record<CardType, CardInfo> = {
  cash: { id: 'cash', name: 'Cash', icon: '💵', color: '#10b981' },
  savings: { id: 'savings', name: 'Savings', icon: '🏦', color: '#3b82f6' },
  crypto: { id: 'crypto', name: 'Crypto', icon: '₿', color: '#f59e0b' },
  stocks: { id: 'stocks', name: 'Stocks', icon: '📈', color: '#8b5cf6' },
  networth: { id: 'networth', name: 'Net Worth', icon: '💰', color: '#06b6d4' },
  tools: { id: 'tools', name: 'Tools', icon: '🛠️', color: '#6366f1' },
  news: { id: 'news', name: 'News', icon: '📰', color: '#ef4444' },
  realestate: { id: 'realestate', name: 'Real Estate', icon: '🏠', color: '#06b6d4' },
  trading: { id: 'trading', name: 'Trading', icon: '📊', color: '#0891b2' },
  valuableitems: { id: 'valuableitems', name: 'Valuable Items', icon: '💎', color: '#ec4899' },
  expenses: { id: 'expenses', name: 'Expenses', icon: '💳', color: '#f43f5e' },
  taxes: { id: 'taxes', name: 'Taxes', icon: '🧾', color: '#3b82f6' },
};

interface HiddenCardsContextType {
  hiddenCards: CardType[];
  hideCard: (cardId: CardType) => void;
  showCard: (cardId: CardType) => void;
  isCardHidden: (cardId: CardType) => boolean;
  getHiddenCardInfo: () => CardInfo[];
}

const HiddenCardsContext = createContext<HiddenCardsContextType | undefined>(undefined);

const STORAGE_KEY = 'moneyHub_hiddenCards';

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function HiddenCardsProvider({ children }: { children: ReactNode }) {
  const [hiddenCards, setHiddenCards] = useState<CardType[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const supabaseSyncRef = useRef<((cards: CardType[]) => void) | null>(null);

  // Initialize Supabase sync function
  useEffect(() => {
    import('../lib/supabase/supabase-data-service').then(({ SupabaseDataService }) => {
      supabaseSyncRef.current = debounce(async (cards: CardType[]) => {
        try {
          await SupabaseDataService.updateHiddenCards(cards);
        } catch (error) {
          console.error('Error syncing hidden cards to Supabase:', error);
        }
      }, 1000);
    }).catch(() => {
      // Supabase not available
    });
  }, []);

  // Load hidden cards from localStorage and Supabase on mount
  useEffect(() => {
    const loadHiddenCards = async () => {
      try {
        // First, load from localStorage for immediate display
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setHiddenCards(parsed);
          }
        }

        // Then try to load from Supabase
        try {
          const { SupabaseDataService } = await import('../lib/supabase/supabase-data-service');
          const prefs = await SupabaseDataService.getUserPreferences();
          if (prefs?.hiddenCards && Array.isArray(prefs.hiddenCards)) {
            setHiddenCards(prefs.hiddenCards as CardType[]);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs.hiddenCards));
          }
        } catch {
          // Supabase not available
        }
      } catch (error) {
        console.error('Error loading hidden cards:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadHiddenCards();
  }, []);

  // Save to localStorage whenever hiddenCards changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenCards));
        if (supabaseSyncRef.current) {
          supabaseSyncRef.current(hiddenCards);
        }
      } catch (error) {
        console.error('Error saving hidden cards:', error);
      }
    }
  }, [hiddenCards, isLoaded]);

  const hideCard = useCallback((cardId: CardType) => {
    setHiddenCards(prev => {
      if (!prev.includes(cardId)) {
        return [...prev, cardId];
      }
      return prev;
    });
  }, []);

  const showCard = useCallback((cardId: CardType) => {
    setHiddenCards(prev => prev.filter(id => id !== cardId));
  }, []);

  const isCardHidden = useCallback((cardId: CardType) => {
    return hiddenCards.includes(cardId);
  }, [hiddenCards]);

  const getHiddenCardInfo = useCallback((): CardInfo[] => {
    return hiddenCards.map(id => CARD_METADATA[id]);
  }, [hiddenCards]);

  return (
    <HiddenCardsContext.Provider
      value={{
        hiddenCards,
        hideCard,
        showCard,
        isCardHidden,
        getHiddenCardInfo,
      }}
    >
      {children}
    </HiddenCardsContext.Provider>
  );
}

export function useHiddenCards() {
  const context = useContext(HiddenCardsContext);
  if (context === undefined) {
    throw new Error('useHiddenCards must be used within a HiddenCardsProvider');
  }
  return context;
}
