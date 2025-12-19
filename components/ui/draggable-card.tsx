"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState, useEffect, useCallback } from "react";

let highestZIndex = 100; // Unclicked cards: 100-999, hovered: 5000-9999, dropdowns: 10000-19999, dragged: 20000+

interface DraggableCardBodyProps {
  children: React.ReactNode;
  className?: string;
  cardId?: string; // Optional card ID for hidden folder feature
}

export const DraggableCardBody = ({
  children,
  className,
  cardId,
}: DraggableCardBodyProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [zIndex, setZIndex] = useState(100);
  const [isHovering, setIsHovering] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const zoomLevelRef = useRef(1);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't drag if clicking on interactive elements or the visual area
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || 
        target.closest('textarea') || target.closest('select') || 
        target.closest('[data-visual-click]') || target.closest('[data-no-drag]')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    // Bring this card to the ABSOLUTE TOP when dragging
    const dragZIndex = 20000 + Date.now() % 1000;
    setZIndex(dragZIndex);
    
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    
    // Get the cardId from window (set by DraggableCardWrapper) or from prop
    const currentCardId = (window as any).__currentDragCard || cardId;
    
    // Dispatch drag start event to disable 3D effects
    window.dispatchEvent(new CustomEvent('cardDragStart', { detail: { cardId: currentCardId } }));
    
    // Get zoom level from the dashboard container's transform scale
    const dashboardContainer = document.querySelector('[data-dashboard-zoom-container]') as HTMLElement;
    zoomLevelRef.current = 1;
    if (dashboardContainer) {
      const transform = dashboardContainer.style.transform;
      const scaleMatch = transform.match(/scale\(([0-9.]+)\)/);
      if (scaleMatch) {
        zoomLevelRef.current = parseFloat(scaleMatch[1]);
      }
    }
    
    // Store offset from mouse to card position (accounts for where user clicked on the card)
    startPos.current = {
      x: e.clientX / zoomLevelRef.current - positionRef.current.x,
      y: e.clientY / zoomLevelRef.current - positionRef.current.y,
    };
    
    // Force immediate z-index update on the DOM element
    if (dragRef.current) {
      dragRef.current.style.zIndex = String(dragZIndex);
    }
  }, [cardId]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    // Track mouse position for drop detection
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    
    // Check if mouse has moved more than 5px (threshold for drag vs click)
    const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
    const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
    
    if (deltaX > 5 || deltaY > 5) {
      hasMoved.current = true;
    }
    
    // Calculate new position accounting for zoom
    const newX = e.clientX / zoomLevelRef.current - startPos.current.x;
    const newY = e.clientY / zoomLevelRef.current - startPos.current.y;
    
    // Update position ref and apply transform directly to DOM (no React state = no lag)
    positionRef.current = { x: newX, y: newY };
    dragRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
    
    // Check if over the hidden folder dropdown and dispatch event
    const hiddenFolderDropdown = document.querySelector('[data-hidden-folder-dropdown]');
    const hiddenFolderButton = document.querySelector('[data-hidden-folder-button]');
    
    let isOverDropTarget = false;
    
    if (hiddenFolderDropdown) {
      const rect = hiddenFolderDropdown.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && 
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        isOverDropTarget = true;
      }
    }
    
    if (hiddenFolderButton) {
      const rect = hiddenFolderButton.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && 
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        isOverDropTarget = true;
      }
    }
    
    // Get cardId from window or prop
    const currentCardId = (window as any).__currentDragCard || cardId;
    
    // Dispatch hover event for the hidden folder to react
    window.dispatchEvent(new CustomEvent('cardDragMove', { 
      detail: { cardId: currentCardId, x: e.clientX, y: e.clientY, isOverDropTarget } 
    }));
  }, [isDragging, cardId]);

  const handleMouseUp = useCallback(() => {
    // Check if we dropped over the hidden folder
    const hiddenFolderDropdown = document.querySelector('[data-hidden-folder-dropdown]');
    const hiddenFolderButton = document.querySelector('[data-hidden-folder-button]');
    
    let droppedOnHiddenFolder = false;
    const { x, y } = lastMousePos.current;
    
    if (hiddenFolderDropdown) {
      const rect = hiddenFolderDropdown.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        droppedOnHiddenFolder = true;
      }
    }
    
    if (hiddenFolderButton) {
      const rect = hiddenFolderButton.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        droppedOnHiddenFolder = true;
      }
    }
    
    // Get cardId from window or prop
    const currentCardId = (window as any).__currentDragCard || cardId;
    
    if (droppedOnHiddenFolder && currentCardId && hasMoved.current) {
      // Dispatch event to hide the card
      window.dispatchEvent(new CustomEvent('hideCardRequest', { detail: { cardId: currentCardId } }));
      
      // Reset position since card will be hidden
      positionRef.current = { x: 0, y: 0 };
      if (dragRef.current) {
        dragRef.current.style.transform = 'translate3d(0px, 0px, 0)';
      }
    }
    
    setIsDragging(false);
    // Clear the current drag card
    (window as any).__currentDragCard = null;
    
    // Dispatch drag end event to re-enable 3D effects
    window.dispatchEvent(new CustomEvent('cardDragEnd', { detail: { cardId: currentCardId } }));
    // After drag ends, lower z-index back to hover range (5000+) so dropdowns can appear above
    highestZIndex = Math.max(highestZIndex + 1, 5000);
    setZIndex(highestZIndex);
  }, [cardId]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    // Bring card forward when hovering, but keep in clicked card range (5000+) for hologram visibility
    if (!isDragging) {
      highestZIndex = Math.max(highestZIndex + 1, 5000);
      setZIndex(highestZIndex);
      if (dragRef.current) {
        dragRef.current.style.zIndex = String(highestZIndex);
      }
    }
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  // Listen for reset event
  useEffect(() => {
    const handleReset = () => {
      positionRef.current = { x: 0, y: 0 };
      if (dragRef.current) {
        dragRef.current.style.transform = 'translate3d(0px, 0px, 0)';
      }
      setZIndex(100);
      highestZIndex = 5000;
    };

    window.addEventListener('resetCardPositions', handleReset);
    return () => {
      window.removeEventListener('resetCardPositions', handleReset);
    };
  }, []);

  useEffect(() => {
    if (isDragging) {
      // Use capture phase for faster event handling
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      
      // Disable pointer events on other cards to prevent hover effects during drag
      const allCards = document.querySelectorAll('[data-card]');
      allCards.forEach((card) => {
        if (card !== dragRef.current) {
          (card as HTMLElement).style.pointerEvents = 'none';
        }
      });
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      
      // Re-enable pointer events on all cards
      const allCards = document.querySelectorAll('[data-card]');
      allCards.forEach((card) => {
        (card as HTMLElement).style.pointerEvents = '';
      });
    }
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={dragRef}
      data-card
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "cursor-grab active:cursor-grabbing select-none",
        className
      )}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transform: `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: zIndex,
        position: "relative",
        isolation: "isolate",
        willChange: isDragging ? "transform" : "auto",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {children}
    </div>
  );
};

