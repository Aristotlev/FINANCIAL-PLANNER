"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { useHiddenCards, CardType } from '../../contexts/hidden-cards-context';
import { useCardOrder } from '../../contexts/card-order-context';

interface DraggableCardWrapperProps {
  cardId: CardType;
  children: React.ReactNode;
}

export function DraggableCardWrapper({ cardId, children }: DraggableCardWrapperProps) {
  const { moveCard } = useCardOrder();
  const controls = useAnimation();
  // Removed local state to prevent re-renders during drag start/end
  // This ensures the drag is handled entirely by the compositor/Framer Motion
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Detect touch device on mount
  useEffect(() => {
    isMounted.current = true;
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    return () => {
      isMounted.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleDragStart = useCallback(() => {
    // Dispatch custom event to disable 3D effects in children and notify folder
    window.dispatchEvent(new CustomEvent('cardDragStart', { detail: { cardId } }));
  }, [cardId]);

  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Throttle event dispatch to prevent lag
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('cardDragMove', { 
        detail: { 
          cardId,
          x: info.point.x,
          y: info.point.y
        } 
      }));
      rafRef.current = null;
    });
  }, [cardId]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isMounted.current) return;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // Check what we dropped on
    // Use elementsFromPoint to look through the dragged element
    const elements = document.elementsFromPoint(info.point.x, info.point.y);
    
    // 1. Check for Hidden Folder
    // Robust check: Look for ANY element in the stack that belongs to the hidden folder
    const isOverHiddenFolder = elements.some(el => 
      el.closest('[data-hidden-folder-button]') || 
      el.closest('[data-hidden-folder-dropdown]')
    );

    if (isOverHiddenFolder) {
       window.dispatchEvent(new CustomEvent('hideCardRequest', { detail: { cardId } }));
       // Do NOT animate controls here as the component is likely unmounting
       window.dispatchEvent(new CustomEvent('cardDragEnd'));
       return;
    }

    // 2. Check for other cards (Swap on Drop)
    // Find the first element that is NOT part of the dragged card
    const dropTarget = elements.find(el => !el.closest(`[data-card-id="${cardId}"]`));
    const targetCardWrapper = dropTarget?.closest('[data-card-id]');
    
    if (targetCardWrapper) {
       const targetId = targetCardWrapper.getAttribute('data-card-id');
       if (targetId && targetId !== cardId) {
          moveCard(cardId, targetId as CardType);
       }
    }

    // Reset position (layout prop handles the actual move animation)
    if (isMounted.current) {
      controls.start({ x: 0, y: 0, scale: 1 });
    }
    window.dispatchEvent(new CustomEvent('cardDragEnd'));
  }, [cardId, controls, moveCard]);

  return (
    <motion.div
      ref={wrapperRef}
      layout
      layoutId={cardId} // Helps Framer Motion track the element across renders
      drag={!isTouchDevice}
      dragConstraints={false} // Allow dragging anywhere without constraints
      dragMomentum={false}
      dragElastic={0} // Ensure 1:1 movement with cursor
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={controls}
      // Use whileDrag for visual states to avoid React re-renders
      whileDrag={{ scale: 1, cursor: 'grabbing', zIndex: 100000 }}
      whileHover={{ scale: 1.02, zIndex: 10 }}
      className={`relative ${isTouchDevice ? '' : 'cursor-grab active:cursor-grabbing'}`}
      style={{ 
        zIndex: 1, // Base z-index
        touchAction: isTouchDevice ? 'auto' : 'none',
      }}
      data-card-id={cardId}
    >
      {children}
    </motion.div>
  );
}
