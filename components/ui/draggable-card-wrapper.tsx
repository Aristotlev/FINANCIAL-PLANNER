"use client";

import React, { useState, useRef, useEffect } from 'react';
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

  // Listen for card drag events from DraggableCardBody and set the cardId
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Check if this wrapper or its children contain the mousedown target
      if (wrapperRef.current?.contains(e.target as Node)) {
        // Set the current drag card ID when mouse down on this card
        (window as any).__currentDragCard = cardId;
      }
    };

    const handleMouseUp = () => {
      // Clear after a short delay to allow drop detection
      setTimeout(() => {
        if ((window as any).__currentDragCard === cardId) {
          (window as any).__currentDragCard = null;
        }
      }, 100);
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [cardId]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
