"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useHiddenCards, CardType } from '../../contexts/hidden-cards-context';
import { useCardOrder } from '../../contexts/card-order-context';

interface DraggableCardWrapperProps {
  cardId: CardType;
  children: React.ReactNode;
}

export function DraggableCardWrapper({ cardId, children }: DraggableCardWrapperProps) {
  const { moveCard } = useCardOrder();
  const [isHovered, setIsHovered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Optimized: Only attach global mouseup listener when drag starts
  // This replaces 20+ constant global listeners with 0 (until interaction)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Set the current drag card ID
    (window as any).__currentDragCard = cardId;

    const handleMouseUp = () => {
      // Clear after a short delay to allow drop detection
      setTimeout(() => {
        if ((window as any).__currentDragCard === cardId) {
          (window as any).__currentDragCard = null;
        }
      }, 100);
      
      // Remove the listener immediately after use
      document.removeEventListener('mouseup', handleMouseUp, true);
    };

    document.addEventListener('mouseup', handleMouseUp, true);
  }, [cardId]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDownCapture={handleMouseDown}
      className="transition-all duration-200 relative group cursor-grab hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: isHovered ? 50 : 1,
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </div>
  );
}
