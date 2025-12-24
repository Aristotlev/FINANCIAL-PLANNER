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
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

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

  // 3D Tilt Effect - GPU Accelerated
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (max 10 degrees)
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    setRotation({ x: rotateX, y: rotateY });
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseDownCapture={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`transition-all duration-200 relative group ${isTouchDevice ? '' : 'cursor-grab hover:shadow-2xl active:scale-[0.98]'}`}
      style={{
        // Only disable touch-action on non-touch devices (for mouse drag)
        // On touch devices, allow normal scrolling
        touchAction: isTouchDevice ? 'auto' : 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: isHovered ? 50 : 1,
        transform: isHovered && !isTouchDevice 
          ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(1.02)` 
          : 'perspective(1000px) rotateX(0) rotateY(0) scale(1)',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
}
