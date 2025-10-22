"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export function CardOrderProvider({ children }: { children: ReactNode }) {
  const [cardOrder, setCardOrder] = useState<CardType[]>(DEFAULT_CARD_ORDER);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load card order from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_CARD_ORDER.length) {
          // Validate that all expected cards are present
          const hasAllCards = DEFAULT_CARD_ORDER.every(card => parsed.includes(card));
          if (hasAllCards) {
            setCardOrder(parsed);
          }
        }
      }
    } catch (error) {
      console.error('Error loading card order:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever cardOrder changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cardOrder));
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

  const moveCard = (draggedCardId: CardType, targetCardId: CardType) => {
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
  };

  const resetOrder = () => {
    setCardOrder(DEFAULT_CARD_ORDER);
  };

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
