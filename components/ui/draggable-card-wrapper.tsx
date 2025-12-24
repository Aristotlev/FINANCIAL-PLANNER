"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useHiddenCards, CardType } from '../../contexts/hidden-cards-context';
import { useCardOrder } from '../../contexts/card-order-context';

interface DraggableCardWrapperProps {
  cardId: CardType;
  children: React.ReactNode;
}

export function DraggableCardWrapper({ cardId, children }: DraggableCardWrapperProps) {
  const { moveCard } = useCardOrder();
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Optimized: Only attach global mouseup listener when drag starts
  // This replaces 20+ constant global listeners with 0 (until interaction)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't enable drag on touch devices
    if (isTouchDevice) return;
    
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
  }, [cardId, isTouchDevice]);

  const handleMouseUp = useCallback(() => {
    const draggedCardId = (window as any).__currentDragCard;
    if (draggedCardId && draggedCardId !== cardId) {
      moveCard(draggedCardId, cardId);
      (window as any).__currentDragCard = null;
    }
  }, [cardId, moveCard]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDownCapture={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`transition-all duration-200 relative group ${isTouchDevice ? '' : 'cursor-grab hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]'}`}
      style={{
        // Only disable touch-action on non-touch devices (for mouse drag)
        // On touch devices, allow normal scrolling
        touchAction: isTouchDevice ? 'auto' : 'none',
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
